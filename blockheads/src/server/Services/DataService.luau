-- Player data: loading, saving, session locking and replication to the owner.
--
-- Safety rules implemented here:
--   * A profile is only ever created by a successful DataStore read. If loading fails
--     the player is kicked and NOTHING is written, so a temporary outage can never
--     overwrite a good save with defaults.
--   * Each save carries a session lock (JobId). A server only writes if it still owns
--     the lock, which prevents two servers from duplicating or clobbering progress.
--   * Saves happen on leave, on shutdown (BindToClose) and every AutosaveInterval.
--   * Data is versioned; see MIGRATIONS for upgrading old saves.
--
-- In Studio, if "Enable Studio Access to API Services" is off, an in-memory store is
-- used so the game is still fully playable (nothing is saved between test sessions).

local DataStoreService = game:GetService("DataStoreService")
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local GameConfig = require(Shared.Config.GameConfig)
local Businesses = require(Shared.Config.Businesses)
local Characters = require(Shared.Config.Characters)
local Cosmetics = require(Shared.Config.Cosmetics)
local Formulas = require(Shared.Modules.Formulas)
local Signal = require(Shared.Modules.Signal)
local Remotes = require(script.Parent.Remotes)

local DataService = {
	Loaded = Signal.new(), -- (player, profile) profile is ready
	Releasing = Signal.new(), -- (player, profile) about to be saved and dropped
	Changed = Signal.new(), -- (player, profile) coalesced "something changed"
}

local profiles: { [Player]: any } = {}
local dirty: { [Player]: boolean } = {}
local releasing: { [Player]: boolean } = {}
local store: any = nil
local usingMock = false
local shuttingDown = false

local function defaultProfile()
	return {
		Version = GameConfig.DataVersion,
		Coins = GameConfig.StartingCoins,
		TotalEarned = 0,
		Level = 1,
		XP = 0,
		BusinessTier = 1,
		Upgrades = { Speed = 0, Quality = 0, Capacity = 0, Staff = 0, Storage = 0, Appearance = 0 },
		Products = { Lemonade = 1 }, -- productId -> level
		Characters = { Brix = true }, -- characterId -> owned
		Equipped = { "Brix" }, -- ordered team
		Befriend = {}, -- characterId -> visits served
		Cosmetics = { [Cosmetics.Default] = true },
		EquippedCosmetic = Cosmetics.Default,
		Register = 0, -- coins waiting in the cash register (staff sales)
		Stats = {
			Served = 0,
			Lost = 0,
			BestCombo = 0,
			RushPoints = 0,
			RushWins = 0,
			RushesPlayed = 0,
			PlayTime = 0,
		},
		Daily = { LastDay = 0, Streak = 0 },
		Quests = { Day = 0, List = {} },
		Tutorial = 1, -- current tutorial step; 0 = finished
		Settings = { Sfx = true, Music = true },
	}
end

-- MIGRATIONS[n] upgrades a save from version n to n + 1.
local MIGRATIONS: { [number]: (data: any) -> () } = {
	-- [1] = function(data) data.NewField = 0 end,
}

local function deepCopy(value: any): any
	if typeof(value) ~= "table" then
		return value
	end
	local copy = {}
	for key, item in value do
		copy[key] = deepCopy(item)
	end
	return copy
end

-- Fills in any fields that are missing from an older save.
local function reconcile(data: any, template: any)
	for key, default in template do
		if data[key] == nil then
			data[key] = deepCopy(default)
		elseif typeof(default) == "table" and typeof(data[key]) == "table" then
			local firstKey = next(default)
			if typeof(firstKey) == "string" then
				reconcile(data[key], default)
			end
		end
	end
end

local function cleanNumber(value: any, fallback: number, minimum: number): number
	if typeof(value) ~= "number" or value ~= value or value == math.huge then
		return fallback
	end
	return math.max(minimum, value)
end

local function sanitize(data: any)
	data.Coins = cleanNumber(data.Coins, 0, 0)
	data.TotalEarned = cleanNumber(data.TotalEarned, 0, 0)
	data.Register = cleanNumber(data.Register, 0, 0)
	data.Level = math.floor(cleanNumber(data.Level, 1, 1))
	data.XP = cleanNumber(data.XP, 0, 0)
	data.BusinessTier = math.clamp(math.floor(cleanNumber(data.BusinessTier, 1, 1)), 1, #Businesses)

	local team = {}
	for _, characterId in data.Equipped do
		if Characters.ById[characterId] and data.Characters[characterId] and not table.find(team, characterId) then
			table.insert(team, characterId)
		end
	end
	while #team > Formulas.teamSlots(data) do
		table.remove(team)
	end
	data.Equipped = team

	if not Cosmetics.ById[data.EquippedCosmetic] or not data.Cosmetics[data.EquippedCosmetic] then
		data.EquippedCosmetic = Cosmetics.Default
	end
end

local function prepare(data: any)
	while data.Version < GameConfig.DataVersion do
		local migrate = MIGRATIONS[data.Version]
		if migrate then
			migrate(data)
		end
		data.Version += 1
	end
	reconcile(data, defaultProfile())
	sanitize(data)
end

---------------------------------------------------------------------------------------
-- Store access
---------------------------------------------------------------------------------------

-- In-memory stand-in with the same UpdateAsync contract. Studio only.
local function newMockStore()
	local contents = {}
	local mock = {}
	function mock:UpdateAsync(key: string, transform: (any) -> any)
		local result = transform(deepCopy(contents[key]))
		if result ~= nil then
			contents[key] = deepCopy(result)
		end
		return deepCopy(contents[key])
	end
	return mock
end

local function getStore()
	if store then
		return store
	end
	local ok, result = pcall(function()
		return DataStoreService:GetDataStore(GameConfig.DataStoreName)
	end)
	if ok then
		store = result
	elseif RunService:IsStudio() then
		warn("[DataService] DataStores unavailable in Studio - using temporary in-memory data.")
		store = newMockStore()
		usingMock = true
	else
		error(result)
	end
	return store
end

local function keyFor(userId: number): string
	return "Player_" .. userId
end

-- Returns the loaded data, or nil plus a reason shown to the player.
local function loadAsync(player: Player): (any?, string?)
	local key = keyFor(player.UserId)
	local lastReason = "Your data could not be loaded. Please rejoin."

	for attempt = 1, 6 do
		if player.Parent == nil then
			return nil, "left"
		end
		local lockedElsewhere = false
		local ok, result = pcall(function()
			return getStore():UpdateAsync(key, function(old)
				local now = os.time()
				if
					old
					and old.Session
					and old.Session.JobId ~= game.JobId
					and now - (old.Session.Time or 0) < GameConfig.SessionLockTimeout
				then
					lockedElsewhere = true
					return nil -- cancel: another server still owns this save
				end
				lockedElsewhere = false
				local data = old or defaultProfile()
				data.Session = { JobId = game.JobId, Time = now }
				return data
			end)
		end)

		if ok and not lockedElsewhere and typeof(result) == "table" then
			return result, nil
		end

		if not ok and RunService:IsStudio() and not usingMock then
			-- Most likely "Enable Studio Access to API Services" is off. The mock never
			-- touches real saves, so falling back is always safe.
			warn(`[DataService] DataStore error in Studio ({result}) - using temporary in-memory data.`)
			store = newMockStore()
			usingMock = true
		elseif lockedElsewhere then
			lastReason = "Your data is still saving in another server. Please rejoin in a minute."
			task.wait(5)
		else
			if not ok then
				warn(`[DataService] Load attempt {attempt} failed for {player.Name}: {result}`)
			end
			task.wait(math.min(2 ^ attempt, 10))
		end
	end
	return nil, lastReason
end

-- Writes the profile. `release` clears the session lock (player is leaving).
local function saveAsync(userId: number, profile: any, release: boolean): boolean
	local key = keyFor(userId)
	for attempt = 1, 4 do
		local lostLock = false
		local ok, err = pcall(function()
			getStore():UpdateAsync(key, function(old)
				if not old or not old.Session or old.Session.JobId ~= game.JobId then
					lostLock = true
					return nil -- never overwrite a save this server no longer owns
				end
				local data = deepCopy(profile)
				if release then
					data.Session = nil
				else
					data.Session = { JobId = game.JobId, Time = os.time() }
				end
				return data
			end)
		end)
		if ok then
			if lostLock then
				warn(`[DataService] Lost session lock for {userId}; save skipped.`)
				return false
			end
			return true
		end
		warn(`[DataService] Save attempt {attempt} failed for {userId}: {err}`)
		if attempt < 4 then
			task.wait(2 * attempt)
		end
	end
	return false
end

---------------------------------------------------------------------------------------
-- Public API
---------------------------------------------------------------------------------------

function DataService.get(player: Player): any?
	return profiles[player]
end

-- Call after changing a profile. The owner's client and listeners of
-- DataService.Changed are updated on the next flush (a few times per second).
function DataService.markDirty(player: Player)
	if profiles[player] then
		dirty[player] = true
	end
end

function DataService.all(): { [Player]: any }
	return profiles
end

local function onPlayerAdded(player: Player)
	if profiles[player] or shuttingDown then
		return
	end
	local joinedAt = os.time()
	local data, reason = loadAsync(player)

	if not data then
		if reason ~= "left" then
			player:Kick(reason)
		end
		return
	end

	local ok, err = pcall(prepare, data)
	if not ok then
		-- Corrupt or unexpected data: do not touch it, just release our lock by leaving
		-- the stored value alone, and ask the player to rejoin.
		warn(`[DataService] Could not prepare data for {player.Name}: {err}`)
		player:Kick("Your data could not be read. Please rejoin; if this keeps happening contact the developer.")
		return
	end

	if player.Parent == nil then
		-- Left while loading: hand the lock back without changing anything else.
		saveAsync(player.UserId, data, true)
		return
	end

	profiles[player] = data
	player:SetAttribute("JoinedAt", joinedAt)
	player:SetAttribute("DataLoaded", true)
	DataService.Loaded:Fire(player, data)
	DataService.markDirty(player)
end

local function release(player: Player)
	local profile = profiles[player]
	if not profile or releasing[player] then
		return
	end
	releasing[player] = true
	local joinedAt = player:GetAttribute("JoinedAt")
	if typeof(joinedAt) == "number" then
		profile.Stats.PlayTime += math.max(0, os.time() - joinedAt)
	end
	DataService.Releasing:Fire(player, profile)
	saveAsync(player.UserId, profile, true)
	profiles[player] = nil
	dirty[player] = nil
	releasing[player] = nil
end

function DataService.Init() end

function DataService.Start()
	Remotes.register("GetState", function(player)
		local profile = profiles[player]
		if not profile then
			return false, "Loading"
		end
		Remotes.Events.StateUpdate:FireClient(player, profile)
		return true
	end)

	Remotes.register("SetSetting", function(player, key: any, value: any)
		local profile = profiles[player]
		if not profile or typeof(key) ~= "string" or typeof(value) ~= "boolean" then
			return false, "Bad request"
		end
		if typeof(profile.Settings[key]) ~= "boolean" then
			return false, "Unknown setting"
		end
		profile.Settings[key] = value
		DataService.markDirty(player)
		return true
	end)

	Players.PlayerRemoving:Connect(release)

	-- Replicate coalesced changes.
	task.spawn(function()
		while true do
			task.wait(0.15)
			for player in dirty do
				dirty[player] = nil
				local profile = profiles[player]
				if profile and player.Parent then
					Remotes.Events.StateUpdate:FireClient(player, profile)
					DataService.Changed:Fire(player, profile)
				end
			end
		end
	end)

	-- Autosave, staggered so saves do not all land on the same frame.
	task.spawn(function()
		while true do
			task.wait(GameConfig.AutosaveInterval)
			for player, profile in profiles do
				if not releasing[player] and player.Parent then
					task.spawn(saveAsync, player.UserId, profile, false)
					task.wait(0.5)
				end
			end
		end
	end)

	game:BindToClose(function()
		shuttingDown = true
		local pending = 0
		for player in profiles do
			pending += 1
			task.spawn(function()
				release(player)
				pending -= 1
			end)
		end
		local deadline = os.clock() + 25
		while pending > 0 and os.clock() < deadline do
			task.wait(0.1)
		end
	end)
end

-- Called by Main after every service has started, so that all listeners of
-- DataService.Loaded exist before the first profile arrives.
function DataService.Begin()
	Players.PlayerAdded:Connect(onPlayerAdded)
	for _, player in Players:GetPlayers() do
		task.spawn(onPlayerAdded, player)
	end
end

return DataService
