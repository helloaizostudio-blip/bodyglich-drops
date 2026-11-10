-- Headless test harness (runs under Lune: https://lune-org.github.io/docs).
--
-- Loads the built place file, runs the real server and client scripts against Lune's
-- Roblox instance library, and fakes the engine pieces Lune does not provide
-- (events, remotes, DataStores, tweens, players). Lune validates every property
-- name and value type against the Roblox API dump, so a typo like `TextSise` or a
-- wrong enum fails here instead of in Studio.
--
-- This is NOT Roblox. Rendering, physics, input, ProximityPrompt holding and real
-- networking are not simulated; those still need a play test in Studio.

local fs = require("@lune/fs")
local luau = require("@lune/luau")
local roblox = require("@lune/roblox")
local task = require("@lune/task")

local Harness = {}

---------------------------------------------------------------------------------------
-- Mock signal
---------------------------------------------------------------------------------------

local MockSignal = {}
MockSignal.__index = MockSignal

function MockSignal.new()
	return setmetatable({ handlers = {} }, MockSignal)
end

function MockSignal:Connect(fn)
	local connection = { Connected = true }
	local entry = { fn = fn, connection = connection }
	table.insert(self.handlers, entry)
	local handlers = self.handlers
	function connection:Disconnect()
		connection.Connected = false
		local index = table.find(handlers, entry)
		if index then
			table.remove(handlers, index)
		end
	end
	return connection
end

function MockSignal:Once(fn)
	local connection
	connection = self:Connect(function(...)
		connection:Disconnect()
		fn(...)
	end)
	return connection
end

function MockSignal:Fire(...)
	for _, entry in table.clone(self.handlers) do
		if entry.connection.Connected then
			task.spawn(entry.fn, ...)
		end
	end
end

---------------------------------------------------------------------------------------
-- Random (Roblox global, not part of Luau)
---------------------------------------------------------------------------------------

local Random = {}
Random.__index = Random
local randomCounter = 0

function Random.new(seed: number?)
	randomCounter += 1
	local value = math.floor(seed or (os.clock() * 1e6 + randomCounter * 7919)) % 2147483646 + 1
	local self = setmetatable({ state = value }, Random)
	self:NextNumber()
	return self
end

function Random:NextNumber(min: number?, max: number?): number
	self.state = (self.state * 48271) % 2147483647
	local unit = (self.state - 1) / 2147483646
	if min and max then
		return min + (max - min) * unit
	end
	return unit
end

function Random:NextInteger(min: number, max: number): number
	return math.min(max, min + math.floor(self:NextNumber() * (max - min + 1)))
end

---------------------------------------------------------------------------------------
-- Shared mock state
---------------------------------------------------------------------------------------

local state = {
	game = nil :: any,
	signals = {} :: { [any]: { [string]: any } },
	values = {} :: { [any]: { [string]: any } },
	localPlayer = nil :: any,
	closeCallbacks = {},
	kicked = {} :: { [number]: string },
	stores = {} :: { [string]: any },
	failKeys = {} :: { [string]: boolean },
	watchedAttributes = {} :: { [any]: { [string]: any } },
	tagged = {} :: { [any]: string },
	isStudio = false,
	errors = {} :: { string },
}
Harness.state = state

local function signal(instance: any, name: string)
	local bucket = state.signals[instance]
	if not bucket then
		bucket = {}
		state.signals[instance] = bucket
	end
	if not bucket[name] then
		bucket[name] = MockSignal.new()
	end
	return bucket[name]
end
Harness.signal = signal

local function value(instance: any, name: string, default: any?)
	local bucket = state.values[instance]
	if bucket and bucket[name] ~= nil then
		return bucket[name]
	end
	return default
end

local function setValue(instance: any, name: string, newValue: any)
	local bucket = state.values[instance]
	if not bucket then
		bucket = {}
		state.values[instance] = bucket
	end
	bucket[name] = newValue
end

local function deepCopy(item: any): any
	if type(item) ~= "table" then
		return item
	end
	local copy = {}
	for key, child in item do
		copy[key] = deepCopy(child)
	end
	return copy
end
Harness.deepCopy = deepCopy

local function watchAttributes(instance: any)
	if not state.watchedAttributes[instance] then
		state.watchedAttributes[instance] = instance:GetAttributes()
	end
end

---------------------------------------------------------------------------------------
-- DataStore mocks
---------------------------------------------------------------------------------------

local function mockDataStore(name: string)
	local store = { Name = name, contents = {}, writes = 0 }
	function store:UpdateAsync(key: string, transform)
		if state.failKeys[key] then
			error("502: API Services rejected request (simulated outage)")
		end
		local result = transform(deepCopy(self.contents[key]))
		if result ~= nil then
			self.contents[key] = deepCopy(result)
			self.writes += 1
		end
		return deepCopy(self.contents[key])
	end
	function store:SetAsync(key: string, newValue: any)
		self.contents[key] = deepCopy(newValue)
	end
	function store:GetSortedAsync(ascending: boolean, pageSize: number)
		local items = {}
		for key, item in self.contents do
			table.insert(items, { key = key, value = item })
		end
		table.sort(items, function(a, b)
			if ascending then
				return a.value < b.value
			end
			return a.value > b.value
		end)
		local page = {}
		for index = 1, math.min(pageSize, #items) do
			page[index] = items[index]
		end
		return {
			GetCurrentPage = function()
				return page
			end,
		}
	end
	return store
end

---------------------------------------------------------------------------------------
-- Engine mocks (registered once per process)
---------------------------------------------------------------------------------------

local installed = false

local function install()
	if installed then
		return
	end
	installed = true

	local events = {
		{ "Players", "PlayerAdded" },
		{ "Players", "PlayerRemoving" },
		{ "Player", "CharacterAdded" },
		{ "BasePart", "Touched" },
		{ "ProximityPrompt", "Triggered" },
		{ "RemoteEvent", "OnServerEvent" },
		{ "RemoteEvent", "OnClientEvent" },
		{ "RunService", "Heartbeat" },
		{ "RunService", "RenderStepped" },
		{ "ProximityPromptService", "PromptTriggered" },
		{ "GuiButton", "Activated" },
		{ "GuiButton", "MouseButton1Down" },
		{ "GuiButton", "MouseButton1Up" },
		{ "GuiButton", "MouseButton1Click" },
		{ "GuiObject", "MouseLeave" },
		{ "GuiObject", "MouseEnter" },
		{ "Instance", "ChildAdded" },
		{ "Instance", "Destroying" },
	}
	for _, pair in events do
		local className, eventName = pair[1], pair[2]
		roblox.implementProperty(className, eventName, function(instance)
			return signal(instance, eventName)
		end)
	end

	roblox.implementProperty("Instance", "AttributeChanged", function(instance)
		watchAttributes(instance)
		return signal(instance, "AttributeChanged")
	end)
	roblox.implementMethod("Instance", "GetAttributeChangedSignal", function(instance, name)
		watchAttributes(instance)
		return signal(instance, "Attribute:" .. name)
	end)
	roblox.implementMethod("Instance", "GetPropertyChangedSignal", function(instance, name)
		return signal(instance, "Property:" .. name)
	end)
	roblox.implementMethod("Instance", "WaitForChild", function(instance, name, timeout)
		local deadline = os.clock() + (timeout or 5)
		while true do
			local child = instance:FindFirstChild(name)
			if child then
				return child
			end
			if os.clock() > deadline then
				error(`WaitForChild timed out: {instance:GetFullName()}.{name}`)
			end
			task.wait(0.02)
		end
	end)

	-- Parts and models
	roblox.implementMethod("PVInstance", "PivotTo", function(instance, cframe)
		if instance:IsA("BasePart") then
			instance.CFrame = cframe
		elseif instance.PrimaryPart then
			instance.PrimaryPart.CFrame = cframe
		end
	end)
	roblox.implementMethod("PVInstance", "GetPivot", function(instance)
		if instance:IsA("BasePart") then
			return instance.CFrame
		end
		return if instance.PrimaryPart then instance.PrimaryPart.CFrame else roblox.CFrame.new()
	end)
	roblox.implementMethod("Sound", "Play", function() end)

	-- Players
	roblox.implementMethod("Players", "GetPlayers", function(players)
		local list = {}
		for _, child in players:GetChildren() do
			if child:IsA("Player") then
				table.insert(list, child)
			end
		end
		return list
	end)
	roblox.implementMethod("Players", "GetPlayerFromCharacter", function(players, character)
		for _, child in players:GetChildren() do
			if child:IsA("Player") and child.Character == character then
				return child
			end
		end
		return nil
	end)
	roblox.implementMethod("Players", "GetPlayerByUserId", function(players, userId)
		for _, child in players:GetChildren() do
			if child:IsA("Player") and child.UserId == userId then
				return child
			end
		end
		return nil
	end)
	roblox.implementMethod("Players", "GetNameFromUserIdAsync", function(_, userId)
		return "User" .. userId
	end)
	roblox.implementMethod("Player", "Kick", function(player, message)
		state.kicked[player.UserId] = message or ""
		Harness.removePlayer(player)
	end)

	-- Services
	roblox.implementMethod("DataModel", "BindToClose", function(_, callback)
		table.insert(state.closeCallbacks, callback)
	end)
	roblox.implementMethod("Workspace", "GetServerTimeNow", function()
		return os.clock() + 1000
	end)
	roblox.implementMethod("RunService", "IsStudio", function()
		return state.isStudio
	end)
	roblox.implementMethod("DataStoreService", "GetDataStore", function(_, name)
		state.stores[name] = state.stores[name] or mockDataStore(name)
		return state.stores[name]
	end)
	roblox.implementMethod("DataStoreService", "GetOrderedDataStore", function(_, name)
		state.stores[name] = state.stores[name] or mockDataStore(name)
		return state.stores[name]
	end)
	roblox.implementMethod("TweenService", "Create", function(_, instance, _, goal)
		local tween = { Completed = MockSignal.new() }
		function tween:Play()
			-- Apply the goal instantly; this still validates property names and types.
			for key, target in goal do
				instance[key] = target
			end
			tween.Completed:Fire()
		end
		function tween:Cancel() end
		return tween
	end)
	roblox.implementMethod("CollectionService", "GetTagged", function(_, tag)
		local list = {}
		for instance, instanceTag in state.tagged do
			if instanceTag == tag then
				table.insert(list, instance)
			end
		end
		return list
	end)
	roblox.implementMethod("CollectionService", "GetInstanceAddedSignal", function(_, tag)
		return signal(state.game, "TagAdded:" .. tag)
	end)
	roblox.implementMethod("CollectionService", "GetInstanceRemovedSignal", function(_, tag)
		return signal(state.game, "TagRemoved:" .. tag)
	end)

	-- Remotes. Arguments are deep-copied, like real network serialisation.
	roblox.implementMethod("RemoteEvent", "FireClient", function(remote, player, ...)
		if player == state.localPlayer then
			signal(remote, "OnClientEvent"):Fire(table.unpack(deepCopy({ ... })))
		end
		signal(remote, "Sent"):Fire(player, ...)
	end)
	roblox.implementMethod("RemoteEvent", "FireAllClients", function(remote, ...)
		if state.localPlayer then
			signal(remote, "OnClientEvent"):Fire(table.unpack(deepCopy({ ... })))
		end
		signal(remote, "Sent"):Fire(nil, ...)
	end)
	roblox.implementMethod("RemoteEvent", "FireServer", function(remote, ...)
		signal(remote, "OnServerEvent"):Fire(state.localPlayer, table.unpack(deepCopy({ ... })))
	end)
	roblox.implementProperty("RemoteFunction", "OnServerInvoke", function(remote)
		return value(remote, "OnServerInvoke")
	end, function(remote, callback)
		setValue(remote, "OnServerInvoke", callback)
	end)
	roblox.implementMethod("RemoteFunction", "InvokeServer", function(remote, ...)
		local callback = value(remote, "OnServerInvoke")
		return callback(state.localPlayer, table.unpack(deepCopy({ ... })))
	end)
end

---------------------------------------------------------------------------------------
-- Script loading
---------------------------------------------------------------------------------------

local moduleCache: { [any]: any } = {}

local function makeEnvironment(scriptInstance: any)
	local env = {}
	local function requireInstance(target: any)
		if moduleCache[target] ~= nil then
			return moduleCache[target].result
		end
		assert(typeof(target) == "Instance" and target.ClassName == "ModuleScript", "require() needs a ModuleScript, got " .. tostring(target))
		local chunk = luau.load(target.Source, {
			debugName = target:GetFullName(),
			environment = makeEnvironment(target),
		})
		local result = chunk()
		moduleCache[target] = { result = result }
		return result
	end

	env.game = state.game
	env.workspace = state.game:GetService("Workspace")
	env.script = scriptInstance
	env.require = requireInstance
	env.Instance = roblox.Instance
	env.Enum = roblox.Enum
	env.Random = Random
	env.task = task
	env.warn = function(...)
		print("[warn]", ...)
	end
	env.tick = os.clock
	env.TweenInfo = {
		new = function(...)
			return { ... }
		end,
	}
	for _, name in {
		"Vector3", "Vector2", "CFrame", "Color3", "UDim", "UDim2", "NumberRange", "NumberSequence",
		"ColorSequence", "NumberSequenceKeypoint", "ColorSequenceKeypoint", "BrickColor", "Rect", "Font",
	} do
		env[name] = (roblox :: any)[name]
	end
	return env
end

function Harness.require(moduleScript: any)
	return makeEnvironment(moduleScript).require(moduleScript)
end

-- Runs a Script / LocalScript instance. Errors are collected in state.errors.
function Harness.runScript(scriptInstance: any)
	local chunk = luau.load(scriptInstance.Source, {
		debugName = scriptInstance:GetFullName(),
		environment = makeEnvironment(scriptInstance),
	})
	local ok, err = pcall(chunk)
	if not ok then
		table.insert(state.errors, `{scriptInstance:GetFullName()}: {err}`)
		print("[script error]", scriptInstance:GetFullName(), err)
	end
	return ok
end

---------------------------------------------------------------------------------------
-- Players
---------------------------------------------------------------------------------------

function Harness.addPlayer(userId: number, name: string)
	local player = roblox.Instance.new("Player")
	player.Name = name
	player.DisplayName = name
	player.UserId = userId
	local gui = roblox.Instance.new("PlayerGui")
	gui.Parent = player

	local character = roblox.Instance.new("Model")
	character.Name = name
	local rootPart = roblox.Instance.new("Part")
	rootPart.Name = "HumanoidRootPart"
	rootPart.CFrame = roblox.CFrame.new(0, 3, 20)
	rootPart.Parent = character
	character.PrimaryPart = rootPart
	character.Parent = state.game:GetService("Workspace")
	player.Character = character

	local players = state.game:GetService("Players")
	player.Parent = players
	signal(players, "PlayerAdded"):Fire(player)
	return player
end

function Harness.removePlayer(player: any)
	if player.Parent == nil then
		return
	end
	local players = state.game:GetService("Players")
	signal(players, "PlayerRemoving"):Fire(player)
	task.defer(function()
		player.Parent = nil
	end)
end

function Harness.setLocalPlayer(player: any)
	state.localPlayer = player
	state.game:GetService("Players").LocalPlayer = player
end

function Harness.moveCharacter(player: any, cframe: any)
	player.Character.PrimaryPart.CFrame = cframe
end

-- Calls the Action RemoteFunction as any player (used to test exploit attempts).
function Harness.invoke(player: any, ...: any)
	local remote = state.game:GetService("ReplicatedStorage").Remotes.Action
	return value(remote, "OnServerInvoke")(player, table.unpack(deepCopy({ ... })))
end

function Harness.close()
	for _, callback in state.closeCallbacks do
		callback()
	end
end

---------------------------------------------------------------------------------------
-- Boot
---------------------------------------------------------------------------------------

function Harness.boot(placePath: string)
	install()
	local game = roblox.deserializePlace(fs.readFile(placePath))
	state.game = game
	-- Properties Lune has no default for must be given a value before they are read.
	game.JobId = "test-job-1"
	local workspace = game:GetService("Workspace")
	local camera = workspace.CurrentCamera
	if not camera then
		camera = roblox.Instance.new("Camera")
		camera.Parent = workspace
		workspace.CurrentCamera = camera
	end
	camera.ViewportSize = roblox.Vector2.new(1280, 720)

	-- Background pump: frames, attribute change detection, removed-tag detection.
	task.spawn(function()
		local runService = game:GetService("RunService")
		while true do
			task.wait(1 / 30)

			for instance, previous in state.watchedAttributes do
				local alive, current = pcall(instance.GetAttributes, instance)
				if not alive then
					state.watchedAttributes[instance] = nil
					continue
				end
				for name, newValue in current do
					if previous[name] ~= newValue then
						signal(instance, "AttributeChanged"):Fire(name)
						signal(instance, "Attribute:" .. name):Fire()
					end
				end
				state.watchedAttributes[instance] = current
			end

			-- Detect newly tagged customers (Instance:AddTag cannot be intercepted).
			local npcs = workspace:FindFirstChild("NPCs")
			if npcs then
				for _, child in npcs:GetChildren() do
					if not state.tagged[child] and child:HasTag("Customer") then
						state.tagged[child] = "Customer"
						signal(game, "TagAdded:Customer"):Fire(child)
					end
				end
			end

			-- Destroyed instances error on any access in Lune; treat that as "removed".
			for instance, tag in state.tagged do
				local alive, parent = pcall(function()
					return instance.Parent
				end)
				if not alive or parent == nil then
					state.tagged[instance] = nil
					state.watchedAttributes[instance] = nil
					signal(game, "TagRemoved:" .. tag):Fire(instance)
				end
			end

			signal(runService, "Heartbeat"):Fire(1 / 30)
			signal(runService, "RenderStepped"):Fire(1 / 30)
		end
	end)
	return game
end

return Harness
