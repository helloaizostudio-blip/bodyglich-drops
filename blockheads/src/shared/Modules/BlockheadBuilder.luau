-- Builds blocky "Blockhead" figures out of plain parts (no asset IDs needed).
-- Used for NPC customers (client side) and collectible characters (server + UI).
--
-- A figure hangs off a flat invisible Root part whose position is the point on the
-- ground between the feet, facing Root.CFrame.LookVector. Move the Root's CFrame and
-- the whole figure follows.
--
-- If ReplicatedStorage > Assets > Characters contains a Model named after a character
-- Id, buildCharacter() uses that model instead of the placeholder.

local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Make = require(script.Parent.Make)
local Characters = require(script.Parent.Parent.Config.Characters)

local BlockheadBuilder = {}

local DARK = Color3.fromRGB(35, 38, 58)
local WHITE = Color3.fromRGB(255, 255, 255)

local SKINS = {
	Color3.fromRGB(255, 214, 102),
	Color3.fromRGB(255, 196, 170),
	Color3.fromRGB(236, 170, 120),
	Color3.fromRGB(196, 150, 110),
	Color3.fromRGB(150, 110, 80),
	Color3.fromRGB(180, 220, 255),
	Color3.fromRGB(190, 240, 170),
}
local SHIRTS = {
	Color3.fromRGB(64, 156, 255),
	Color3.fromRGB(255, 120, 160),
	Color3.fromRGB(120, 200, 80),
	Color3.fromRGB(255, 170, 60),
	Color3.fromRGB(160, 110, 250),
	Color3.fromRGB(80, 210, 200),
	Color3.fromRGB(240, 240, 240),
}
local PANTS = {
	Color3.fromRGB(52, 73, 110),
	Color3.fromRGB(70, 70, 80),
	Color3.fromRGB(110, 80, 60),
	Color3.fromRGB(60, 100, 80),
}
local EYES = { "Dot", "Dot", "Wide", "Sleepy" }
local MOUTHS = { "Smile", "Smile", "Grin", "Flat", "Open" }
local RANDOM_HATS = { "Cap", "Beanie" }

-- A random everyday look, stable for a given seed (so every client sees the same NPC).
function BlockheadBuilder.randomLook(seed: number)
	local rng = Random.new(seed)
	local look = {
		Skin = SKINS[rng:NextInteger(1, #SKINS)],
		Shirt = SHIRTS[rng:NextInteger(1, #SHIRTS)],
		Pants = PANTS[rng:NextInteger(1, #PANTS)],
		Eyes = EYES[rng:NextInteger(1, #EYES)],
		Mouth = MOUTHS[rng:NextInteger(1, #MOUTHS)],
		Hat = nil :: string?,
		HatColor = nil :: Color3?,
		Scale = 0.9 + rng:NextNumber() * 0.2,
	}
	if rng:NextNumber() < 0.3 then
		look.Hat = RANDOM_HATS[rng:NextInteger(1, #RANDOM_HATS)]
		look.HatColor = SHIRTS[rng:NextInteger(1, #SHIRTS)]
	end
	return look
end

local function block(root: BasePart, name: string, size: Vector3, offset: CFrame, color: Color3, material: Enum.Material?)
	local part = Make("Part", {
		Name = name,
		Size = size,
		Color = color,
		Material = material or Enum.Material.SmoothPlastic,
		TopSurface = Enum.SurfaceType.Smooth,
		BottomSurface = Enum.SurfaceType.Smooth,
		Anchored = false,
		CanCollide = false,
		CanQuery = false,
		CanTouch = false,
		Massless = true,
		CastShadow = false,
		CFrame = root.CFrame * offset,
		Parent = root,
	})
	Make("Weld", { Part0 = root, Part1 = part, C0 = offset, Parent = part })
	return part
end

local function faceFrame(parent, position: UDim2, size: UDim2, color: Color3, round: boolean?)
	local frame = Make("Frame", {
		AnchorPoint = Vector2.new(0.5, 0.5),
		Position = position,
		Size = size,
		BackgroundColor3 = color,
		BorderSizePixel = 0,
		Parent = parent,
	})
	Make("UICorner", { CornerRadius = UDim.new(round and 1 or 0.3, 0), Parent = frame })
	return frame
end

-- Draws eyes and a mouth into any GuiObject (a SurfaceGui on a head, or a UI frame).
function BlockheadBuilder.drawFace(parent, look)
	for _, x in { 0.3, 0.7 } do
		local at = UDim2.fromScale(x, 0.4)
		if look.Eyes == "Wide" then
			local white = faceFrame(parent, at, UDim2.fromScale(0.2, 0.24), WHITE, true)
			Make("UIStroke", { Color = DARK, Thickness = 2, Parent = white })
			faceFrame(white, UDim2.fromScale(0.5, 0.55), UDim2.fromScale(0.5, 0.5), DARK, true)
		elseif look.Eyes == "Sleepy" then
			faceFrame(parent, at, UDim2.fromScale(0.18, 0.05), DARK)
		elseif look.Eyes == "Star" then
			Make("TextLabel", {
				AnchorPoint = Vector2.new(0.5, 0.5),
				Position = at,
				Size = UDim2.fromScale(0.3, 0.3),
				BackgroundTransparency = 1,
				Text = "★",
				TextScaled = true,
				TextColor3 = DARK,
				Font = Enum.Font.GothamBold,
				Parent = parent,
			})
		else
			faceFrame(parent, at, UDim2.fromScale(0.12, 0.17), DARK, true)
		end
	end

	local mouthAt = UDim2.fromScale(0.5, 0.72)
	if look.Mouth == "Grin" then
		local mouth = faceFrame(parent, mouthAt, UDim2.fromScale(0.42, 0.18), DARK)
		faceFrame(mouth, UDim2.fromScale(0.5, 0.25), UDim2.fromScale(0.8, 0.35), WHITE)
	elseif look.Mouth == "Flat" then
		faceFrame(parent, mouthAt, UDim2.fromScale(0.26, 0.05), DARK)
	elseif look.Mouth == "Open" then
		faceFrame(parent, mouthAt, UDim2.fromScale(0.18, 0.18), DARK, true)
	else
		faceFrame(parent, mouthAt, UDim2.fromScale(0.34, 0.09), DARK)
	end
end

local function addHat(root: BasePart, look, scale: number, headTop: number)
	local color = look.HatColor or DARK
	local s = scale
	local function at(x: number, y: number, z: number): CFrame
		return CFrame.new(x * s, headTop + y * s, z * s)
	end
	local hat = look.Hat
	if hat == "Cap" then
		block(root, "Hat", Vector3.new(2.5, 0.5, 2.5) * s, at(0, 0.25, 0), color)
		block(root, "Brim", Vector3.new(2.5, 0.2, 1) * s, at(0, 0.1, -1.7), color)
	elseif hat == "Beanie" then
		block(root, "Hat", Vector3.new(2.6, 0.8, 2.6) * s, at(0, 0.3, 0), color)
		block(root, "Pom", Vector3.new(0.7, 0.7, 0.7) * s, at(0, 1.0, 0), WHITE)
	elseif hat == "ChefHat" then
		block(root, "Hat", Vector3.new(1.8, 1.2, 1.8) * s, at(0, 0.6, 0), color)
		block(root, "Puff", Vector3.new(2.4, 0.9, 2.4) * s, at(0, 1.6, 0), color)
	elseif hat == "TopHat" then
		block(root, "Brim", Vector3.new(3, 0.2, 3) * s, at(0, 0.1, 0), color)
		block(root, "Hat", Vector3.new(1.9, 1.6, 1.9) * s, at(0, 1.0, 0), color)
	elseif hat == "Crown" then
		block(root, "Hat", Vector3.new(2.2, 0.5, 2.2) * s, at(0, 0.25, 0), color, Enum.Material.Neon)
		for _, x in { -0.8, 0, 0.8 } do
			block(root, "Spike", Vector3.new(0.5, 0.6, 0.5) * s, at(x, 0.8, -0.8), color, Enum.Material.Neon)
			block(root, "Spike", Vector3.new(0.5, 0.6, 0.5) * s, at(x, 0.8, 0.8), color, Enum.Material.Neon)
		end
	elseif hat == "Headphones" then
		block(root, "Band", Vector3.new(2.8, 0.3, 0.5) * s, at(0, 0.15, 0), DARK)
		block(root, "EarL", Vector3.new(0.5, 1.2, 1.2) * s, at(-1.45, -1.2, 0), color, Enum.Material.Neon)
		block(root, "EarR", Vector3.new(0.5, 1.2, 1.2) * s, at(1.45, -1.2, 0), color, Enum.Material.Neon)
	elseif hat == "Bow" then
		block(root, "BowL", Vector3.new(0.9, 0.8, 0.5) * s, at(-0.55, 0.4, 0), color)
		block(root, "BowR", Vector3.new(0.9, 0.8, 0.5) * s, at(0.55, 0.4, 0), color)
		block(root, "Knot", Vector3.new(0.4, 0.5, 0.6) * s, at(0, 0.35, 0), WHITE)
	end
end

-- Adds the body parts for `look` to an existing Root part. Returns the head part.
function BlockheadBuilder.attach(root: BasePart, look): BasePart
	local s = look.Scale or 1
	block(root, "LegL", Vector3.new(0.9, 1.6, 0.9) * s, CFrame.new(-0.5 * s, 0.8 * s, 0), look.Pants)
	block(root, "LegR", Vector3.new(0.9, 1.6, 0.9) * s, CFrame.new(0.5 * s, 0.8 * s, 0), look.Pants)
	block(root, "Torso", Vector3.new(2, 1.8, 1.1) * s, CFrame.new(0, 2.5 * s, 0), look.Shirt)
	block(root, "ArmL", Vector3.new(0.7, 1.7, 0.8) * s, CFrame.new(-1.4 * s, 2.5 * s, 0), look.Skin)
	block(root, "ArmR", Vector3.new(0.7, 1.7, 0.8) * s, CFrame.new(1.4 * s, 2.5 * s, 0), look.Skin)
	local head = block(root, "Head", Vector3.new(2.4, 2.4, 2.4) * s, CFrame.new(0, 4.6 * s, 0), look.Skin)

	local face = Make("SurfaceGui", {
		Name = "Face",
		Face = Enum.NormalId.Front,
		CanvasSize = Vector2.new(100, 100),
		LightInfluence = 0.4,
		Parent = head,
	})
	local canvas = Make("Frame", {
		Size = UDim2.fromScale(1, 1),
		BackgroundTransparency = 1,
		Parent = face,
	})
	BlockheadBuilder.drawFace(canvas, look)

	if look.Hat then
		addHat(root, look, s, 5.8 * s)
	end
	return head
end

-- Creates the invisible Root part a figure hangs from.
function BlockheadBuilder.newRoot(cframe: CFrame): BasePart
	return Make("Part", {
		Name = "Root",
		Size = Vector3.new(2, 0.2, 2),
		Transparency = 1,
		Anchored = true,
		CanCollide = false,
		CanQuery = false,
		CanTouch = false,
		CFrame = cframe,
	})
end

-- Builds a full standing figure in a Model. `cframe` is the ground point + facing.
function BlockheadBuilder.build(look, cframe: CFrame): Model
	local model = Instance.new("Model")
	model.Name = "Blockhead"
	local root = BlockheadBuilder.newRoot(cframe)
	root.Parent = model
	model.PrimaryPart = root
	BlockheadBuilder.attach(root, look)
	return model
end

-- Builds a collectible character. Prefers a custom model in
-- ReplicatedStorage.Assets.Characters[characterId] when one exists.
function BlockheadBuilder.buildCharacter(characterId: string, cframe: CFrame): Model?
	local character = Characters.ById[characterId]
	if not character then
		return nil
	end

	local assets = ReplicatedStorage:FindFirstChild("Assets")
	local folder = assets and assets:FindFirstChild("Characters")
	local custom = folder and folder:FindFirstChild(characterId)
	if custom and custom:IsA("Model") and custom.PrimaryPart then
		local clone = custom:Clone()
		clone.Name = characterId
		for _, descendant in clone:GetDescendants() do
			if descendant:IsA("BasePart") then
				descendant.Anchored = true
				descendant.CanCollide = false
			end
		end
		-- Custom models pivot wherever the artist placed the pivot; we expect feet.
		clone:PivotTo(cframe)
		return clone
	end

	local model = BlockheadBuilder.build(character.Look, cframe)
	model.Name = characterId
	return model
end

return BlockheadBuilder
