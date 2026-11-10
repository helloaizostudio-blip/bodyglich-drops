-- Client-side world interactions:
--   * kiosks: any ProximityPrompt with an "OpenPanel" attribute opens that UI panel
--   * shops: only the owner can use a plot's Serve prompt; your shop gets a marker
--   * tutorial: the hint line and the guide beam to your shop

local Players = game:GetService("Players")
local ProximityPromptService = game:GetService("ProximityPromptService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Workspace = game:GetService("Workspace")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local Make = require(Shared.Modules.Make)
local Theme = require(Shared.Config.Theme)
local State = require(script.Parent.State)
local Hud = require(script.Parent.Hud)

local World = {}

local player = Players.LocalPlayer
local SERVE_DISTANCE = 11
local myPlot: Model? = nil
local marker: BillboardGui? = nil
local beam: Beam? = nil
local beamStart: Attachment? = nil
local beamEnd: Attachment? = nil

local TUTORIAL_TEXT = {
	[1] = "👉 Go to YOUR SHOP on Business Street, stand behind the counter and hold the Serve button!",
	[2] = "⬆️ Nice! Now open UPGRADES and buy Faster Hands.",
	[3] = "🛒 Open the SHOP and add Strawberry Lemonade to your menu.",
}

local function updatePlot(plot: Instance)
	local servePoint = plot:FindFirstChild("ServePoint")
	local prompt = servePoint and servePoint:FindFirstChild("ServePrompt")
	local mine = plot:GetAttribute("OwnerUserId") == player.UserId
	if prompt and prompt:IsA("ProximityPrompt") then
		-- Local-only change: other players' counters simply never show a prompt.
		prompt.MaxActivationDistance = if mine then SERVE_DISTANCE else 0
	end
	if mine and myPlot ~= plot then
		myPlot = plot :: Model
		local pad = plot:FindFirstChild("Pad")
		if pad then
			if marker then
				marker:Destroy()
			end
			marker = Make("BillboardGui", {
				Name = "MyShopMarker",
				Size = UDim2.fromOffset(150, 44),
				StudsOffsetWorldSpace = Vector3.new(0, 22, 0),
				AlwaysOnTop = true,
				MaxDistance = 600,
				Parent = pad,
			})
			local label = Make("TextLabel", {
				Size = UDim2.fromScale(1, 1),
				BackgroundColor3 = Theme.Yellow,
				Text = "⭐ YOUR SHOP",
				Font = Theme.Font,
				TextSize = 20,
				TextColor3 = Theme.Dark,
				Parent = marker,
			})
			Make("UICorner", { CornerRadius = UDim.new(0, 12), Parent = label })
			Make("UIStroke", { Thickness = 2.5, Color = Theme.Dark, ApplyStrokeMode = Enum.ApplyStrokeMode.Border, Parent = label })
		end
	elseif not mine and myPlot == plot then
		myPlot = nil
		if marker then
			marker:Destroy()
			marker = nil
		end
	end
end

local function watchPlot(plot: Instance)
	task.spawn(function()
		-- The plot's children may arrive after the plot itself.
		plot:WaitForChild("Pad", 30)
		local servePoint = plot:WaitForChild("ServePoint", 30)
		if servePoint then
			servePoint:WaitForChild("ServePrompt", 30)
		end
		updatePlot(plot)
		plot:GetAttributeChangedSignal("OwnerUserId"):Connect(function()
			updatePlot(plot)
		end)
	end)
end

local function clearBeam()
	if beam then
		beam:Destroy()
		beam = nil
	end
	if beamStart then
		beamStart:Destroy()
		beamStart = nil
	end
	if beamEnd then
		beamEnd:Destroy()
		beamEnd = nil
	end
end

local function updateGuide()
	local profile = State.Profile
	local step = if profile then profile.Tutorial else 0
	Hud.setHint(TUTORIAL_TEXT[step])

	local character = player.Character
	local rootPart = character and character:FindFirstChild("HumanoidRootPart")
	local pad = myPlot and myPlot:FindFirstChild("Pad")
	local wanted = step == 1
		and rootPart ~= nil
		and pad ~= nil
		and (rootPart.CFrame.Position - pad.CFrame.Position).Magnitude > 28

	if not wanted then
		clearBeam()
		return
	end
	if beam and beamStart and beamStart.Parent == rootPart then
		return
	end
	clearBeam()
	beamStart = Make("Attachment", { Name = "GuideStart", Parent = rootPart })
	beamEnd = Make("Attachment", { Name = "GuideEnd", Position = Vector3.new(0, 3, 0), Parent = pad })
	beam = Make("Beam", {
		Name = "GuideBeam",
		Attachment0 = beamStart,
		Attachment1 = beamEnd,
		Width0 = 1.6,
		Width1 = 1.6,
		FaceCamera = true,
		Color = ColorSequence.new(Theme.Yellow),
		Transparency = NumberSequence.new(0.25),
		LightEmission = 0.6,
		Segments = 1,
		Parent = pad,
	})
end

function World.Start()
	ProximityPromptService.PromptTriggered:Connect(function(prompt)
		local panel = prompt:GetAttribute("OpenPanel")
		if typeof(panel) == "string" then
			Hud.open(panel)
		end
	end)

	task.spawn(function()
		local plots = Workspace:WaitForChild("ShopPlots")
		plots.ChildAdded:Connect(watchPlot)
		for _, plot in plots:GetChildren() do
			watchPlot(plot)
		end
	end)

	State.Changed:Connect(updateGuide)
	task.spawn(function()
		while true do
			task.wait(0.5)
			updateGuide()
		end
	end)
end

return World
