-- Small helpers for building the town out of plain parts.

local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local Make = require(Shared.Modules.Make)
local Theme = require(Shared.Config.Theme)

local Build = {}

-- An anchored, smooth part. `props` overrides any default.
function Build.part(props: { [string]: any }): Part
	local merged = {
		Anchored = true,
		Material = Enum.Material.SmoothPlastic,
		TopSurface = Enum.SurfaceType.Smooth,
		BottomSurface = Enum.SurfaceType.Smooth,
	}
	for key, value in props do
		merged[key] = value
	end
	return Make("Part", merged)
end

-- A flat disc lying on the ground (cylinders are built along the X axis).
function Build.disc(center: Vector3, radius: number, height: number, props: { [string]: any }): Part
	local merged = {
		Shape = Enum.PartType.Cylinder,
		Size = Vector3.new(height, radius * 2, radius * 2),
		CFrame = CFrame.new(center) * CFrame.Angles(0, 0, math.pi / 2),
	}
	for key, value in props do
		merged[key] = value
	end
	return Build.part(merged)
end

-- Text on a part face. Returns the TextLabel so it can be updated later.
function Build.label(part: BasePart, face: Enum.NormalId, text: string, props: { [string]: any }?): TextLabel
	local gui = Make("SurfaceGui", {
		Name = "Label",
		Face = face,
		SizingMode = Enum.SurfaceGuiSizingMode.PixelsPerStud,
		PixelsPerStud = 30,
		LightInfluence = 0,
		Parent = part,
	})
	local labelProps = {
		Size = UDim2.fromScale(0.94, 0.9),
		Position = UDim2.fromScale(0.5, 0.5),
		AnchorPoint = Vector2.new(0.5, 0.5),
		BackgroundTransparency = 1,
		Text = text,
		TextScaled = true,
		Font = Theme.Font,
		TextColor3 = Theme.White,
		Parent = gui,
	}
	if props then
		for key, value in props do
			labelProps[key] = value
		end
	end
	local label = Make("TextLabel", labelProps)
	Make("UIStroke", { Color = Theme.Dark, Thickness = 3, Parent = label })
	return label
end

-- A floating label that always faces the camera.
function Build.billboard(parent: Instance, text: string, offset: Vector3, size: UDim2?, props: { [string]: any }?): TextLabel
	local gui = Make("BillboardGui", {
		Name = "Billboard",
		Size = size or UDim2.fromScale(8, 2),
		StudsOffsetWorldSpace = offset,
		MaxDistance = 90,
		LightInfluence = 0,
		Parent = parent,
	})
	local labelProps = {
		Size = UDim2.fromScale(1, 1),
		BackgroundTransparency = 1,
		Text = text,
		TextScaled = true,
		Font = Theme.Font,
		TextColor3 = Theme.White,
		Parent = gui,
	}
	if props then
		for key, value in props do
			labelProps[key] = value
		end
	end
	local label = Make("TextLabel", labelProps)
	Make("UIStroke", { Color = Theme.Dark, Thickness = 2.5, Parent = label })
	return label
end

-- A standing notice board facing `cframe.LookVector`. Returns title and body labels.
function Build.board(parent: Instance, cframe: CFrame, size: Vector2, title: string, color: Color3): (TextLabel, TextLabel)
	local model = Make("Model", { Name = title, Parent = parent })
	for _, x in { -size.X / 2 + 0.6, size.X / 2 - 0.6 } do
		Build.part({
			Name = "Post",
			Size = Vector3.new(0.8, size.Y + 3, 0.8),
			CFrame = cframe * CFrame.new(x, (size.Y + 3) / 2, 0.3),
			Color = Theme.Dark,
			Parent = model,
		})
	end
	local header = Build.part({
		Name = "Header",
		Size = Vector3.new(size.X, 2.2, 0.8),
		CFrame = cframe * CFrame.new(0, size.Y + 3 - 1.1, 0),
		Color = color,
		Parent = model,
	})
	local body = Build.part({
		Name = "Body",
		Size = Vector3.new(size.X, size.Y - 2.2, 0.6),
		CFrame = cframe * CFrame.new(0, 3 + (size.Y - 2.2) / 2, 0),
		Color = Theme.Panel,
		Parent = model,
	})
	local titleLabel = Build.label(header, Enum.NormalId.Front, title)
	local bodyLabel = Build.label(body, Enum.NormalId.Front, "", {
		TextColor3 = Theme.Text,
		Font = Theme.BoldFont,
		TextScaled = true,
		RichText = true,
	})
	local stroke = bodyLabel:FindFirstChildOfClass("UIStroke")
	if stroke then
		stroke:Destroy()
	end
	return titleLabel, bodyLabel
end

-- A pedestal with a ProximityPrompt that opens a UI panel on the client
-- (the client listens for prompts carrying the "OpenPanel" attribute).
function Build.kiosk(parent: Instance, cframe: CFrame, title: string, panel: string, color: Color3): Part
	local base = Build.part({
		Name = title .. " Kiosk",
		Size = Vector3.new(4, 3.5, 4),
		CFrame = cframe * CFrame.new(0, 1.75, 0),
		Color = color,
		Parent = parent,
	})
	Build.part({
		Name = "Top",
		Size = Vector3.new(4.6, 0.5, 4.6),
		CFrame = cframe * CFrame.new(0, 3.75, 0),
		Color = Theme.White,
		Parent = base,
	})
	Build.billboard(base, title, Vector3.new(0, 5.2, 0), UDim2.fromScale(11, 2.2))
	local prompt = Make("ProximityPrompt", {
		ActionText = "Open",
		ObjectText = title,
		HoldDuration = 0,
		MaxActivationDistance = 12,
		RequiresLineOfSight = false,
		Parent = base,
	})
	prompt:SetAttribute("OpenPanel", panel)
	return base
end

function Build.tree(parent: Instance, position: Vector3, scale: number)
	local model = Make("Model", { Name = "Tree", Parent = parent })
	Build.part({
		Name = "Trunk",
		Size = Vector3.new(1.6, 6, 1.6) * scale,
		CFrame = CFrame.new(position + Vector3.new(0, 3 * scale, 0)),
		Color = Color3.fromRGB(132, 92, 62),
		Parent = model,
	})
	Build.part({
		Name = "Leaves",
		Size = Vector3.new(7, 5, 7) * scale,
		CFrame = CFrame.new(position + Vector3.new(0, 8 * scale, 0)),
		Color = Color3.fromRGB(88, 190, 96),
		Parent = model,
	})
	Build.part({
		Name = "LeavesTop",
		Size = Vector3.new(4.5, 3, 4.5) * scale,
		CFrame = CFrame.new(position + Vector3.new(0, 11.5 * scale, 0)),
		Color = Color3.fromRGB(110, 208, 110),
		Parent = model,
	})
end

function Build.lamp(parent: Instance, position: Vector3)
	local model = Make("Model", { Name = "Lamp", Parent = parent })
	Build.part({
		Name = "Pole",
		Size = Vector3.new(0.6, 10, 0.6),
		CFrame = CFrame.new(position + Vector3.new(0, 5, 0)),
		Color = Theme.Dark,
		Parent = model,
	})
	Build.part({
		Name = "Bulb",
		Size = Vector3.new(1.6, 1.6, 1.6),
		CFrame = CFrame.new(position + Vector3.new(0, 10.6, 0)),
		Color = Color3.fromRGB(255, 236, 170),
		Material = Enum.Material.Neon,
		Shape = Enum.PartType.Ball,
		Parent = model,
	})
end

return Build
