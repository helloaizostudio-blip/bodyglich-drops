-- Builds the town, owns the eight business plots and assigns one to each player.
--
-- A plot is a Model in Workspace.ShopPlots with:
--   Pad            the floor
--   ServePoint     invisible part at the counter holding the "Serve" ProximityPrompt
--   RegisterPoint  invisible part holding the register billboard
--   Stand          folder of visuals, rebuilt whenever the owner's shop changes
-- Attributes: OwnerUserId (0 = vacant), OwnerName.

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local Make = require(Shared.Modules.Make)
local Signal = require(Shared.Modules.Signal)
local Theme = require(Shared.Config.Theme)
local DataService = require(script.Parent.DataService)
local Remotes = require(script.Parent.Remotes)
local World = script.Parent.Parent.World
local TownBuilder = require(World.TownBuilder)
local StandBuilder = require(World.StandBuilder)
local Build = require(World.Build)

local PlotService = {
	Plots = {},
	Town = nil :: any,
	Claimed = Signal.new(), -- (plot, player, profile)
	Released = Signal.new(), -- (plot, player)
}

local byPlayer: { [Player]: any } = {}
local refreshQueued: { [Player]: boolean } = {}
local lastRefresh: { [Player]: number } = {}
local REFRESH_COOLDOWN = 1 -- seconds between rebuilds of one shop (rebuilds replicate to everyone)

local function createPlot(index: number, cframe: CFrame, size: number, parent: Instance)
	local model = Make("Model", { Name = "Plot" .. index })
	model:SetAttribute("OwnerUserId", 0)
	model:SetAttribute("OwnerName", "")
	model:SetAttribute("PlotIndex", index)

	local pad = Build.part({
		Name = "Pad",
		Size = Vector3.new(size, 0.4, size),
		CFrame = cframe * CFrame.new(0, -0.19, 0),
		Color = Color3.fromRGB(246, 238, 222),
		Parent = model,
	})
	model.PrimaryPart = pad

	local servePoint = Build.part({
		Name = "ServePoint",
		Size = Vector3.new(1, 1, 1),
		CFrame = cframe * CFrame.new(0, StandBuilder.CounterHeight + 0.5, StandBuilder.CounterZ),
		Transparency = 1,
		CanCollide = false,
		CanQuery = false,
		CanTouch = false,
		Parent = model,
	})
	local prompt = Make("ProximityPrompt", {
		Name = "ServePrompt",
		ActionText = "Serve",
		ObjectText = "Customer",
		HoldDuration = 2,
		MaxActivationDistance = 11,
		RequiresLineOfSight = false,
		Enabled = false,
		Parent = servePoint,
	})

	local registerPoint = Build.part({
		Name = "RegisterPoint",
		Size = Vector3.new(1, 1, 1),
		CFrame = cframe * CFrame.new(4.4, StandBuilder.CounterHeight + 1.2, StandBuilder.CounterZ),
		Transparency = 1,
		CanCollide = false,
		CanQuery = false,
		CanTouch = false,
		Parent = model,
	})
	local registerLabel = Build.billboard(registerPoint, "", Vector3.new(0, 1.6, 0), UDim2.fromScale(6, 1.2), { TextColor3 = Theme.Yellow })
	registerLabel.Visible = false

	local stand = StandBuilder.buildVacant(cframe)
	stand.Parent = model
	model.Parent = parent

	return {
		Index = index,
		CFrame = cframe,
		Model = model,
		ServePoint = servePoint,
		Prompt = prompt,
		RegisterLabel = registerLabel,
		Stand = stand,
		Owner = nil :: Player?,
	}
end

function PlotService.getPlot(player: Player)
	return byPlayer[player]
end

-- Rebuilds the visible shop. Safe to call many times; rebuilds are coalesced.
function PlotService.refresh(player: Player)
	if refreshQueued[player] or not byPlayer[player] then
		return
	end
	refreshQueued[player] = true
	local wait = math.max(0, REFRESH_COOLDOWN - (os.clock() - (lastRefresh[player] or 0)))
	task.delay(wait, function()
		refreshQueued[player] = nil
		lastRefresh[player] = os.clock()
		local plot = byPlayer[player]
		local profile = DataService.get(player)
		if not plot or not profile then
			return
		end
		local old = plot.Stand
		local stand = StandBuilder.build(plot.CFrame, player.DisplayName, profile)
		stand.Parent = plot.Model
		plot.Stand = stand
		if old then
			old:Destroy()
		end
	end)
end

-- Where the owner stands to serve: just behind the counter, facing the street.
function PlotService.homeCFrame(plot): CFrame
	return plot.CFrame * CFrame.new(0, 3.5, 0.5)
end

local function claim(player: Player, profile)
	for _, plot in PlotService.Plots do
		if not plot.Owner then
			plot.Owner = player
			byPlayer[player] = plot
			plot.Model:SetAttribute("OwnerUserId", player.UserId)
			plot.Model:SetAttribute("OwnerName", player.DisplayName)
			player:SetAttribute("PlotIndex", plot.Index)
			PlotService.refresh(player)
			PlotService.Claimed:Fire(plot, player, profile)
			return
		end
	end
	Remotes.notify(player, "Toast", { Text = "All shop plots are taken in this server.", Kind = "Error" })
end

local function releasePlot(player: Player)
	local plot = byPlayer[player]
	if not plot then
		return
	end
	byPlayer[player] = nil
	refreshQueued[player] = nil
	lastRefresh[player] = nil
	plot.Owner = nil
	plot.Model:SetAttribute("OwnerUserId", 0)
	plot.Model:SetAttribute("OwnerName", "")
	PlotService.Released:Fire(plot, player)
	if plot.Stand then
		plot.Stand:Destroy()
	end
	plot.Stand = StandBuilder.buildVacant(plot.CFrame)
	plot.Stand.Parent = plot.Model
	plot.Prompt.Enabled = false
	plot.RegisterLabel.Visible = false
end

function PlotService.Init()
	local town = TownBuilder.build()
	PlotService.Town = town
	for index, cframe in town.PlotCFrames do
		PlotService.Plots[index] = createPlot(index, cframe, town.PlotSize, town.PlotsFolder)
	end
end

function PlotService.Start()
	DataService.Loaded:Connect(claim)
	for player, profile in DataService.all() do
		if not byPlayer[player] then
			claim(player, profile)
		end
	end
	DataService.Releasing:Connect(releasePlot)
	Players.PlayerRemoving:Connect(function(player)
		-- Covers players who leave before their data finished loading.
		task.defer(releasePlot, player)
	end)

	Remotes.register("TeleportHome", function(player)
		local plot = byPlayer[player]
		local character = player.Character
		if not plot or not character then
			return false, "No shop yet"
		end
		character:PivotTo(PlotService.homeCFrame(plot))
		return true
	end)
end

return PlotService
