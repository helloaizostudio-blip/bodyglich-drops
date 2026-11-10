-- NPC customers: spawning, queueing, ordering, patience, serving, staff and the
-- cash register. One lightweight simulation per owned plot, ticked ten times a second.
--
-- Performance model: the server never animates anything. A customer is a single
-- invisible anchored part carrying attributes (where it is walking, what it ordered,
-- how patient it is). Each client builds the visible Blockhead and animates it locally
-- (see Client/Controllers/CustomerRenderer). All decisions and rewards stay here.

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Workspace = game:GetService("Workspace")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local GameConfig = require(Shared.Config.GameConfig)
local Customers = require(Shared.Config.Customers)
local Products = require(Shared.Config.Products)
local RushConfig = require(Shared.Config.Rush)
local Formulas = require(Shared.Modules.Formulas)
local Format = require(Shared.Modules.Format)
local Signal = require(Shared.Modules.Signal)
local BlockheadBuilder = require(Shared.Modules.BlockheadBuilder)
local DataService = require(script.Parent.DataService)
local EconomyService = require(script.Parent.EconomyService)
local PlotService = require(script.Parent.PlotService)
local BusinessService = require(script.Parent.BusinessService)
local Remotes = require(script.Parent.Remotes)

local CustomerService = {
	Served = Signal.new(), -- (player, info) info = { Type, By, Amount, RushPoints, Fast, Combo, CharacterId }
	Lost = Signal.new(), -- (player, typeId)

	-- Set by CharacterService: (profile) -> characterId? for "Blockhead Visitor" customers.
	VisitorPicker = nil :: ((profile: any) -> string?)?,

	RushActive = false,
	RushSeed = 0,
}

local TICK = 0.1
local MAX_SLOTS = 12
local PATIENCE_SLOTS = 3 -- patience only runs for customers near the front
local CUSTOMER_TAG = "Customer"

local sims: { [any]: any } = {} -- plot -> simulation
local nextCustomerId = 0

---------------------------------------------------------------------------------------
-- Geometry
---------------------------------------------------------------------------------------

local function slotPosition(plot, slot: number): Vector3
	local x, z
	if slot == 1 then
		x, z = 0, -6.5
	elseif slot <= 7 then
		x, z = (slot - 2) * 3, -9.5
	else
		x, z = 15 - (slot - 8) * 3, -12.5
	end
	return plot.CFrame:PointToWorldSpace(Vector3.new(x, 0, z))
end

local function lanePosition(plot, rng: Random): Vector3
	return plot.CFrame:PointToWorldSpace(Vector3.new(rng:NextNumber(-5, 5), 0, rng:NextNumber(-25, -20)))
end

-- A bus stop near the plot: customers appear at and leave from one of the closest.
local function busStop(plot, rng: Random): Vector3
	local stops = plot.NearStops
	if not stops then
		stops = table.clone(PlotService.Town.BusStops)
		local front = plot.CFrame:PointToWorldSpace(Vector3.new(0, 0, -21))
		table.sort(stops, function(a, b)
			return (a - front).Magnitude < (b - front).Magnitude
		end)
		while #stops > 3 do
			table.remove(stops)
		end
		plot.NearStops = stops
	end
	local base = stops[rng:NextInteger(1, #stops)]
	return base + Vector3.new(rng:NextNumber(-1.5, 1.5), 0, rng:NextNumber(-1.5, 1.5))
end

---------------------------------------------------------------------------------------
-- Movement (attribute driven; clients animate)
---------------------------------------------------------------------------------------

local function startLeg(customer, target: Vector3, now: number)
	local distance = (target - customer.Position).Magnitude
	local duration = math.max(0.05, distance / GameConfig.CustomerWalkSpeed)
	local root = customer.Root
	root:SetAttribute("MoveFrom", customer.Position)
	root:SetAttribute("MoveTo", target)
	root:SetAttribute("MoveDur", duration)
	root:SetAttribute("MoveStart", Workspace:GetServerTimeNow())
	customer.Position = target
	customer.MoveEnd = now + duration
end

-- Queues `points` to be walked in order after the current leg.
local function walk(customer, points: { Vector3 }, now: number)
	customer.Path = points
	if now >= customer.MoveEnd and #points > 0 then
		startLeg(customer, table.remove(points, 1) :: Vector3, now)
	end
end

local function isIdle(customer, now: number): boolean
	return #customer.Path == 0 and now >= customer.MoveEnd
end

---------------------------------------------------------------------------------------
-- Spawning
---------------------------------------------------------------------------------------

local function pickWeighted(list, rng: Random, weightOf)
	local total = 0
	for _, item in list do
		total += weightOf(item)
	end
	if total <= 0 then
		return nil
	end
	local roll = rng:NextNumber() * total
	for _, item in list do
		roll -= weightOf(item)
		if roll <= 0 then
			return item
		end
	end
	return list[#list]
end

local function pickType(sim, rng: Random)
	local profile = sim.Profile
	local boost = 1 + GameConfig.SpecialCustomerBoostPerAppearance * profile.Upgrades.Appearance
	local visitor = nil
	if not CustomerService.RushActive and CustomerService.VisitorPicker then
		visitor = CustomerService.VisitorPicker(profile)
	end
	local customerType = pickWeighted(Customers.List, rng, function(entry)
		if entry.Id == "Character" and not visitor then
			return 0
		end
		return if entry.Special then entry.Weight * boost else entry.Weight
	end) or Customers.ById.Normal
	return customerType, if customerType.Id == "Character" then visitor else nil
end

local function spawnCustomer(sim, now: number)
	local plot = sim.Plot
	local typeRng = sim.RushRng or sim.Rng
	local customerType, characterId = pickType(sim, typeRng)

	local menu = Formulas.menu(sim.Profile)
	local orders = {}
	for _ = 1, customerType.Items do
		local entry = pickWeighted(menu, sim.Rng, function(item)
			return item.Weight
		end)
		if entry then
			table.insert(orders, entry.Id)
		end
	end
	if #orders == 0 then
		return
	end

	nextCustomerId += 1
	local slot = #sim.Queue + 1
	local start = busStop(plot, sim.Rng)

	local root = BlockheadBuilder.newRoot(CFrame.new(start))
	root.Name = "Customer" .. nextCustomerId
	root:SetAttribute("Seed", sim.Rng:NextInteger(1, 1000000))
	root:SetAttribute("CType", customerType.Id)
	root:SetAttribute("Order", table.concat(orders, ","))
	root:SetAttribute("Face", plot.ServePoint.CFrame.Position)
	root:SetAttribute("OwnerUserId", sim.Player.UserId)
	if characterId then
		root:SetAttribute("CharacterId", characterId)
	end

	local customer = {
		Id = nextCustomerId,
		Root = root,
		Type = customerType,
		CharacterId = characterId,
		Orders = orders,
		Slot = slot,
		Position = start,
		MoveEnd = now,
		Path = {},
		PatienceStart = nil :: number?,
		PatienceEnd = nil :: number?,
		PatienceDur = 0,
	}
	table.insert(sim.Queue, customer)
	root:AddTag(CUSTOMER_TAG)
	root.Parent = PlotService.Town.NPCFolder
	walk(customer, { lanePosition(plot, sim.Rng), slotPosition(plot, slot) }, now)
end

---------------------------------------------------------------------------------------
-- Queue handling
---------------------------------------------------------------------------------------

local function sendAway(sim, customer, mood: string, now: number)
	customer.Root:SetAttribute("Mood", mood)
	customer.Root:SetAttribute("PatienceDur", 0)
	walk(customer, { lanePosition(sim.Plot, sim.Rng), busStop(sim.Plot, sim.Rng) }, now)
	table.insert(sim.Leaving, customer)
end

local function removeFromQueue(sim, customer, now: number)
	local index = table.find(sim.Queue, customer)
	if not index then
		return
	end
	table.remove(sim.Queue, index)
	for position = index, #sim.Queue do
		local other = sim.Queue[position]
		other.Slot = position
		walk(other, { slotPosition(sim.Plot, position) }, now)
	end
	if sim.Head == customer then
		sim.Head = nil
		sim.Plot.Prompt.Enabled = false
	end
end

local function serveTime(sim, customer): number
	local total = 0
	for index, productId in customer.Orders do
		local seconds = Formulas.productTime(sim.Profile, productId)
		total += if index == 1 then seconds else seconds * GameConfig.MultiOrderTimeFactor
	end
	return total
end

local function orderText(customer): string
	local parts = {}
	for _, productId in customer.Orders do
		local product = Products.ById[productId]
		table.insert(parts, `{product.Emoji} {product.Name}`)
	end
	return table.concat(parts, " + ")
end

local function updateRegisterLabel(sim)
	local profile = sim.Profile
	local label = sim.Plot.RegisterLabel
	local hasStaff = profile.Upgrades.Staff > 0
	if not hasStaff and profile.Register <= 0 then
		label.Visible = false
		return
	end
	local capacity = Formulas.registerCapacity(profile)
	local full = profile.Register >= capacity
	local text = if full
		then `💰 FULL! {Format.number(profile.Register)}`
		else `💰 {Format.number(profile.Register)} / {Format.number(capacity)}`
	if label.Text ~= text then
		label.Text = text
	end
	label.Visible = true
end

local function completeServe(sim, customer, by: string, now: number)
	local profile = sim.Profile
	local player = sim.Player

	local price = 0
	for _, productId in customer.Orders do
		price += Formulas.productPrice(profile, productId)
	end
	price *= customer.Type.PayMult

	local amount, fast = 0, false
	if by == "Player" then
		local comboBonus = Formulas.comboBonus(sim.Combo)
		sim.Combo += 1
		if customer.PatienceStart and customer.PatienceDur > 0 then
			fast = (now - customer.PatienceStart) <= customer.PatienceDur * GameConfig.FastServeWindow
		end
		amount = math.floor(price * (1 + comboBonus) * (1 + (if fast then GameConfig.FastServeTip else 0)) + 0.5)
		EconomyService.addCoins(player, amount)
		EconomyService.addXp(player, customer.Type.Xp)
		if sim.Combo > profile.Stats.BestCombo then
			profile.Stats.BestCombo = sim.Combo
		end
		player:SetAttribute("Combo", sim.Combo)
		Remotes.notify(player, "Sale", {
			Amount = amount,
			Position = customer.Position,
			Combo = sim.Combo,
			Fast = fast,
			Type = customer.Type.Id,
		})
	else
		amount = math.floor(price + 0.5)
		local capacity = Formulas.registerCapacity(profile)
		profile.Register = math.min(capacity, profile.Register + amount)
		EconomyService.addXp(player, math.max(1, customer.Type.Xp // 2))
	end

	profile.Stats.Served += 1
	DataService.markDirty(player)

	removeFromQueue(sim, customer, now)
	sendAway(sim, customer, "Happy", now)
	updateRegisterLabel(sim)

	if by == "Player" then
		BusinessService.advanceTutorial(player, 1)
	end
	CustomerService.Served:Fire(player, {
		Type = customer.Type.Id,
		By = by,
		Amount = amount,
		RushPoints = customer.Type.RushPoints,
		Fast = fast,
		Combo = sim.Combo,
		CharacterId = customer.CharacterId,
	})
end

local function loseCustomer(sim, customer, now: number)
	local player = sim.Player
	sim.Profile.Stats.Lost += 1
	sim.Combo = 0
	player:SetAttribute("Combo", 0)
	DataService.markDirty(player)
	Remotes.notify(player, "Lost", { Position = customer.Position })
	removeFromQueue(sim, customer, now)
	sendAway(sim, customer, "Angry", now)
	CustomerService.Lost:Fire(player, customer.Type.Id)
end

---------------------------------------------------------------------------------------
-- Simulation tick
---------------------------------------------------------------------------------------

local function nextSpawnDelay(sim): number
	local interval = Formulas.spawnInterval(sim.Profile)
	if CustomerService.RushActive then
		interval *= RushConfig.SpawnIntervalMultiplier
	end
	local rng = sim.RushRng or sim.Rng
	local jitter = GameConfig.SpawnIntervalJitter
	return interval * (1 + rng:NextNumber(-jitter, jitter))
end

local function tickSim(sim, now: number)
	local profile = sim.Profile
	local plot = sim.Plot

	-- Finish walking legs and clean up customers who reached the street end.
	for _, customer in sim.Queue do
		if now >= customer.MoveEnd and #customer.Path > 0 then
			startLeg(customer, table.remove(customer.Path, 1), now)
		end
	end
	for index = #sim.Leaving, 1, -1 do
		local customer = sim.Leaving[index]
		if now >= customer.MoveEnd then
			if #customer.Path > 0 then
				startLeg(customer, table.remove(customer.Path, 1), now)
			else
				customer.Root:Destroy()
				table.remove(sim.Leaving, index)
			end
		end
	end

	-- Spawn.
	local capacity = Formulas.queueSize(profile)
	if CustomerService.RushActive then
		capacity += RushConfig.ExtraQueueSlots
	end
	capacity = math.min(capacity, MAX_SLOTS)
	if now >= sim.NextSpawn then
		if #sim.Queue < capacity then
			spawnCustomer(sim, now)
		end
		sim.NextSpawn = now + nextSpawnDelay(sim)
	end

	-- Patience.
	local patienceScale = Formulas.patienceMultiplier(profile)
	if CustomerService.RushActive then
		patienceScale *= RushConfig.PatienceMultiplier
	end
	for index = #sim.Queue, 1, -1 do
		local customer = sim.Queue[index]
		if not customer.PatienceEnd then
			if customer.Slot <= PATIENCE_SLOTS and isIdle(customer, now) then
				customer.PatienceDur = customer.Type.Patience * patienceScale
				customer.PatienceStart = now
				customer.PatienceEnd = now + customer.PatienceDur
				customer.Root:SetAttribute("PatienceStart", Workspace:GetServerTimeNow())
				customer.Root:SetAttribute("PatienceDur", customer.PatienceDur)
			end
		elseif now >= customer.PatienceEnd then
			loseCustomer(sim, customer, now)
		end
	end

	-- Head of the queue: enable the serve prompt and let staff work.
	local head = sim.Queue[1]
	if head and isIdle(head, now) then
		if sim.Head ~= head then
			sim.Head = head
			sim.Holding = false
			sim.HeadReadyAt = now
			sim.HeadServeTime = serveTime(sim, head)
			plot.Prompt.HoldDuration = sim.HeadServeTime
			plot.Prompt.ObjectText = orderText(head)
			plot.Prompt.Enabled = true
		end
		-- Staff step aside while the owner is holding Serve, so a fast team can never
		-- snatch a customer (and the combo / rush points) out of the player's hands.
		local staffMultiplier = Formulas.staffTimeMultiplier(profile)
		if staffMultiplier and not sim.Holding and profile.Register < Formulas.registerCapacity(profile) then
			if now >= sim.HeadReadyAt + sim.HeadServeTime * staffMultiplier then
				completeServe(sim, head, "Staff", now)
			end
		end
	elseif sim.Head then
		sim.Head = nil
		plot.Prompt.Enabled = false
	end

	-- Register: auto-collect when the owner is at the counter.
	sim.RegisterTimer += TICK
	if sim.RegisterTimer >= 0.5 then
		sim.RegisterTimer = 0
		if profile.Register > 0 then
			local character = sim.Player.Character
			local rootPart = character and character.PrimaryPart
			if rootPart and (rootPart.CFrame.Position - plot.ServePoint.CFrame.Position).Magnitude <= GameConfig.RegisterCollectRadius then
				local amount = math.floor(profile.Register)
				profile.Register = 0
				EconomyService.addCoins(sim.Player, amount)
				Remotes.notify(sim.Player, "Collect", { Amount = amount, Position = plot.ServePoint.CFrame.Position })
			end
		end
		updateRegisterLabel(sim)
	end
end

local function onPromptTriggered(plot, player: Player)
	local sim = sims[plot]
	if not sim or sim.Player ~= player then
		return
	end
	local head = sim.Head
	local now = os.clock()
	if not head or sim.Queue[1] ~= head then
		return
	end
	-- The engine enforces the hold on honest clients; this stops exploiters who fire
	-- the prompt instantly. A little slack covers network latency.
	if now - sim.HeadReadyAt < sim.HeadServeTime * 0.8 - 0.25 then
		return
	end
	local character = player.Character
	local rootPart = character and character.PrimaryPart
	if not rootPart or (rootPart.CFrame.Position - plot.ServePoint.CFrame.Position).Magnitude > plot.Prompt.MaxActivationDistance + 8 then
		return
	end
	completeServe(sim, head, "Player", now)
end

---------------------------------------------------------------------------------------
-- Lifecycle
---------------------------------------------------------------------------------------

local function createSim(plot, player: Player, profile)
	local sim = {
		Plot = plot,
		Player = player,
		Profile = profile,
		Queue = {},
		Leaving = {},
		NextSpawn = os.clock() + 2,
		Combo = 0,
		Head = nil,
		HeadReadyAt = 0,
		HeadServeTime = 0,
		Holding = false,
		RegisterTimer = 0,
		Rng = Random.new(),
		RushRng = if CustomerService.RushActive then Random.new(CustomerService.RushSeed) else nil,
	}
	sims[plot] = sim
	player:SetAttribute("Combo", 0)
	updateRegisterLabel(sim)
end

local function destroySim(plot)
	local sim = sims[plot]
	if not sim then
		return
	end
	sims[plot] = nil
	for _, customer in sim.Queue do
		customer.Root:Destroy()
	end
	for _, customer in sim.Leaving do
		customer.Root:Destroy()
	end
	plot.Prompt.Enabled = false
end

-- Called by RushService. Every plot gets the same random seed, so every player
-- faces the same sequence of customer types during a rush.
function CustomerService.setRush(active: boolean, seed: number?)
	CustomerService.RushActive = active
	CustomerService.RushSeed = seed or 0
	local now = os.clock()
	for _, sim in sims do
		sim.RushRng = if active then Random.new(CustomerService.RushSeed) else nil
		if active then
			sim.NextSpawn = now + 0.5
		end
	end
end

function CustomerService.getCombo(player: Player): number
	local plot = PlotService.getPlot(player)
	local sim = plot and sims[plot]
	return if sim then sim.Combo else 0
end

function CustomerService.Init() end

function CustomerService.Start()
	for _, plot in PlotService.Plots do
		plot.Prompt.Triggered:Connect(function(player)
			onPromptTriggered(plot, player)
		end)
		plot.Prompt.PromptButtonHoldBegan:Connect(function(player)
			local sim = sims[plot]
			if sim and sim.Player == player then
				sim.Holding = true
			end
		end)
		plot.Prompt.PromptButtonHoldEnded:Connect(function(player)
			local sim = sims[plot]
			if sim and sim.Player == player then
				sim.Holding = false
			end
		end)
		if plot.Owner and DataService.get(plot.Owner) then
			createSim(plot, plot.Owner, DataService.get(plot.Owner))
		end
	end
	PlotService.Claimed:Connect(createSim)
	PlotService.Released:Connect(destroySim)

	task.spawn(function()
		while true do
			task.wait(TICK)
			local now = os.clock()
			for plot, sim in sims do
				local ok, err = pcall(tickSim, sim, now)
				if not ok then
					warn(`[CustomerService] Plot {plot.Index} tick failed: {err}`)
				end
			end
		end
	end)
end

return CustomerService
