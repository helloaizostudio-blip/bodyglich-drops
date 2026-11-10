-- Server leaderboard (the built-in Roblox player list, via "leaderstats") and the
-- global all-time "Top Tycoons" board in the plaza (OrderedDataStore).

local DataStoreService = game:GetService("DataStoreService")
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local GameConfig = require(Shared.Config.GameConfig)
local Format = require(Shared.Modules.Format)
local DataService = require(script.Parent.DataService)
local PlotService = require(script.Parent.PlotService)

local LeaderboardService = {}

local nameCache: { [number]: string } = {}
local orderedStore: any = nil

local function setupLeaderstats(player: Player, profile)
	local folder = player:FindFirstChild("leaderstats")
	if not folder then
		folder = Instance.new("Folder")
		folder.Name = "leaderstats"
		local coins = Instance.new("IntValue")
		coins.Name = "Coins"
		coins.Parent = folder
		local level = Instance.new("IntValue")
		level.Name = "Level"
		level.Parent = folder
		folder.Parent = player
	end
	folder.Coins.Value = math.floor(profile.Coins)
	folder.Level.Value = profile.Level
end

local function nameFor(userId: number): string
	if nameCache[userId] then
		return nameCache[userId]
	end
	local player = Players:GetPlayerByUserId(userId)
	if player then
		nameCache[userId] = player.DisplayName
		return player.DisplayName
	end
	local ok, name = pcall(function()
		return Players:GetNameFromUserIdAsync(userId)
	end)
	nameCache[userId] = if ok then name else "Player"
	return nameCache[userId]
end

local function localRanking(): { any }
	local entries = {}
	for player, profile in DataService.all() do
		table.insert(entries, { Name = player.DisplayName, Value = profile.TotalEarned })
	end
	table.sort(entries, function(a, b)
		return a.Value > b.Value
	end)
	return entries
end

local function refreshGlobalBoard()
	local label = PlotService.Town.Labels.GlobalLeaderboard
	local entries = nil

	local ok = pcall(function()
		orderedStore = orderedStore or DataStoreService:GetOrderedDataStore(GameConfig.LeaderboardStoreName)
		for player, profile in DataService.all() do
			-- Negative user ids are Studio test players; do not publish them.
			if player.UserId > 0 then
				orderedStore:SetAsync(tostring(player.UserId), math.floor(profile.TotalEarned))
			end
		end
		local pages = orderedStore:GetSortedAsync(false, GameConfig.GlobalLeaderboardSize)
		entries = {}
		for _, item in pages:GetCurrentPage() do
			local userId = tonumber(item.key)
			if userId then
				table.insert(entries, { Name = nameFor(userId), Value = item.value })
			end
		end
	end)

	local title = "All-time earnings"
	if not ok or not entries then
		-- DataStores unavailable (e.g. Studio without API access): show this server.
		entries = localRanking()
		title = "This server"
	end

	local lines = { `<b>{title}</b>` }
	for index, entry in entries do
		if index > GameConfig.GlobalLeaderboardSize then
			break
		end
		table.insert(lines, `{index}. {entry.Name}  -  {Format.number(entry.Value)}`)
	end
	if #lines == 1 then
		table.insert(lines, "Be the first tycoon!")
	end
	label.Text = table.concat(lines, "\n")
end

function LeaderboardService.Init() end

function LeaderboardService.Start()
	DataService.Loaded:Connect(setupLeaderstats)
	DataService.Changed:Connect(setupLeaderstats)
	for player, profile in DataService.all() do
		setupLeaderstats(player, profile)
	end

	task.spawn(function()
		task.wait(8)
		while true do
			refreshGlobalBoard()
			task.wait(GameConfig.GlobalLeaderboardRefresh)
		end
	end)
end

return LeaderboardService
