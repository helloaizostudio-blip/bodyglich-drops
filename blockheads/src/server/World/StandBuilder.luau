-- Builds the visible shop on a plot from the owner's profile: business tier, awning
-- style, Curb Appeal decorations and the equipped character team.
-- Purely visual - gameplay objects (serve prompt, register) live on the plot itself.
--
-- Plot space: the plot CFrame sits at ground level in the middle of the plot and
-- looks at the street, so local -Z is "towards the customers".

local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local Make = require(Shared.Modules.Make)
local Theme = require(Shared.Config.Theme)
local Businesses = require(Shared.Config.Businesses)
local Cosmetics = require(Shared.Config.Cosmetics)
local BlockheadBuilder = require(Shared.Modules.BlockheadBuilder)
local Build = require(script.Parent.Build)

local StandBuilder = {}

StandBuilder.CounterZ = -3 -- local Z of the counter on every tier
StandBuilder.CounterHeight = 3.2

local TEAM_SPOTS = { Vector3.new(-4.6, 0, 0.5), Vector3.new(4.6, 0, 0.5), Vector3.new(-2.2, 0, 3.2) }

local function roofProp(folder: Instance, origin: CFrame, business)
	local id = business.Id
	local function piece(name: string, size: Vector3, offset: CFrame, color: Color3, shape: Enum.PartType?, material: Enum.Material?)
		return Build.part({
			Name = name,
			Size = size,
			CFrame = origin * offset,
			Color = color,
			Shape = shape or Enum.PartType.Block,
			Material = material or Enum.Material.SmoothPlastic,
			CanCollide = false,
			Parent = folder,
		})
	end
	local flat = CFrame.Angles(0, 0, math.pi / 2)
	if id == "Burger" then
		piece("BunBottom", Vector3.new(1.4, 7, 7), CFrame.new(0, 0.7, 0) * flat, Color3.fromRGB(222, 160, 84), Enum.PartType.Cylinder)
		piece("Patty", Vector3.new(1.2, 7.4, 7.4), CFrame.new(0, 2, 0) * flat, Color3.fromRGB(120, 72, 48), Enum.PartType.Cylinder)
		piece("Cheese", Vector3.new(7.6, 0.4, 7.6), CFrame.new(0, 2.8, 0), Color3.fromRGB(255, 205, 56))
		piece("BunTop", Vector3.new(2.2, 7, 7), CFrame.new(0, 4.1, 0) * flat, Color3.fromRGB(232, 170, 90), Enum.PartType.Cylinder)
	elseif id == "Pizza" then
		local tilt = CFrame.Angles(math.rad(-70), 0, 0)
		piece("Crust", Vector3.new(0.8, 9, 9), CFrame.new(0, 4.6, 0) * tilt * flat, Color3.fromRGB(232, 170, 90), Enum.PartType.Cylinder)
		piece("Sauce", Vector3.new(0.9, 7.8, 7.8), CFrame.new(0, 4.6, 0) * tilt * flat, Color3.fromRGB(226, 72, 56), Enum.PartType.Cylinder)
		piece("Cheese", Vector3.new(1.0, 6.8, 6.8), CFrame.new(0, 4.6, 0) * tilt * flat, Color3.fromRGB(255, 222, 120), Enum.PartType.Cylinder)
	elseif id == "IceCream" then
		piece("Cone", Vector3.new(3, 4, 3), CFrame.new(0, 2, 0), Color3.fromRGB(232, 180, 110))
		piece("ScoopA", Vector3.new(4.4, 4.4, 4.4), CFrame.new(0, 5.4, 0), Color3.fromRGB(255, 150, 200), Enum.PartType.Ball)
		piece("ScoopB", Vector3.new(3.6, 3.6, 3.6), CFrame.new(0, 8, 0), Color3.fromRGB(255, 244, 214), Enum.PartType.Ball)
		piece("Cherry", Vector3.new(1.2, 1.2, 1.2), CFrame.new(0, 10.1, 0), Color3.fromRGB(226, 50, 60), Enum.PartType.Ball)
	elseif id == "Restaurant" then
		piece("HatBand", Vector3.new(5, 2.4, 5), CFrame.new(0, 1.2, 0), Theme.White)
		piece("HatPuff", Vector3.new(7, 3.4, 7), CFrame.new(0, 4, 0), Theme.White)
		piece("Star", Vector3.new(2, 2, 0.6), CFrame.new(0, 1.3, -2.6), Theme.Yellow, nil, Enum.Material.Neon)
	end
end

local function decorations(folder: Instance, cframe: CFrame, level: number, halfWidth: number, awningY: number, accent: Color3)
	if level >= 1 then
		for _, x in { -halfWidth - 1.5, halfWidth + 1.5 } do
			Build.part({ Name = "Planter", Size = Vector3.new(2.4, 1.6, 2.4), CFrame = cframe * CFrame.new(x, 0.8, -5), Color = Color3.fromRGB(176, 120, 84), Parent = folder })
			Build.part({ Name = "Bush", Size = Vector3.new(2.2, 1.6, 2.2), CFrame = cframe * CFrame.new(x, 2.3, -5), Color = Color3.fromRGB(88, 190, 96), Parent = folder })
			Build.part({ Name = "Flower", Size = Vector3.new(0.9, 0.9, 0.9), CFrame = cframe * CFrame.new(x, 3.4, -5), Color = Theme.Pink, Shape = Enum.PartType.Ball, CanCollide = false, Parent = folder })
		end
	end
	if level >= 2 then
		local colors = { Theme.Red, Theme.Yellow, Theme.Green, Theme.Blue, Theme.Pink }
		local count = 9
		for index = 1, count do
			local x = -halfWidth + (index - 1) * (halfWidth * 2 / (count - 1))
			Build.part({
				Name = "Light",
				Size = Vector3.new(0.7, 0.7, 0.7),
				CFrame = cframe * CFrame.new(x, awningY - 0.9, -6.2),
				Color = colors[(index - 1) % #colors + 1],
				Material = Enum.Material.Neon,
				Shape = Enum.PartType.Ball,
				CanCollide = false,
				Parent = folder,
			})
		end
	end
	if level >= 3 then
		Build.part({
			Name = "Carpet",
			Size = Vector3.new(6, 0.1, 9),
			CFrame = cframe * CFrame.new(0, 0.06, -10),
			Color = Color3.fromRGB(214, 60, 70),
			CanCollide = false,
			Parent = folder,
		})
	end
	if level >= 4 then
		for _, x in { -halfWidth - 4, halfWidth + 4 } do
			Build.part({ Name = "FlagPole", Size = Vector3.new(0.4, 14, 0.4), CFrame = cframe * CFrame.new(x, 7, -9), Color = Theme.White, Parent = folder })
			Build.part({ Name = "Flag", Size = Vector3.new(0.2, 2.6, 4), CFrame = cframe * CFrame.new(x, 12.5, -7), Color = accent, CanCollide = false, Parent = folder })
		end
	end
	if level >= 5 then
		local star = Build.part({
			Name = "Star",
			Size = Vector3.new(3, 3, 0.6),
			CFrame = cframe * CFrame.new(0, awningY + 6.4, -3.6) * CFrame.Angles(0, 0, math.rad(45)),
			Color = Theme.Yellow,
			Material = Enum.Material.Neon,
			CanCollide = false,
			Parent = folder,
		})
		Make("ParticleEmitter", {
			Rate = 6,
			Lifetime = NumberRange.new(1, 1.6),
			Speed = NumberRange.new(2, 4),
			SpreadAngle = Vector2.new(180, 180),
			Size = NumberSequence.new(0.6, 0),
			Color = ColorSequence.new(Theme.Yellow),
			LightEmission = 0.8,
			Parent = star,
		})
		Make("PointLight", { Color = Theme.Yellow, Range = 18, Brightness = 1.2, Parent = star })
	end
end

-- "For rent" marker shown on plots nobody owns.
function StandBuilder.buildVacant(cframe: CFrame): Folder
	local folder = Make("Folder", { Name = "Stand" })
	Build.part({ Name = "Post", Size = Vector3.new(0.8, 7, 0.8), CFrame = cframe * CFrame.new(0, 3.5, -8), Color = Theme.Dark, Parent = folder })
	local sign = Build.part({ Name = "Sign", Size = Vector3.new(10, 4, 0.6), CFrame = cframe * CFrame.new(0, 7.5, -8), Color = Theme.White, Parent = folder })
	Build.label(sign, Enum.NormalId.Front, "FOR RENT", { TextColor3 = Theme.Red })
	return folder
end

function StandBuilder.build(cframe: CFrame, ownerName: string, profile): Folder
	local folder = Make("Folder", { Name = "Stand" })
	local tier = profile.BusinessTier
	local business = Businesses[tier]
	local cosmetic = Cosmetics.ById[profile.EquippedCosmetic] or Cosmetics.ById[Cosmetics.Default]
	local awningMaterial = if cosmetic.Neon then Enum.Material.Neon else Enum.Material.SmoothPlastic

	local counterWidth = 12
	local counterZ = StandBuilder.CounterZ
	local halfWidth = if tier == 1 then 7 else 9 + tier
	local awningY = if tier == 1 then 9 else 9.5 + tier * 0.5

	-- Counter (same place on every tier, so customers and the serve prompt never move).
	Build.part({
		Name = "Counter",
		Size = Vector3.new(counterWidth, StandBuilder.CounterHeight - 0.4, 2.2),
		CFrame = cframe * CFrame.new(0, (StandBuilder.CounterHeight - 0.4) / 2, counterZ),
		Color = business.Wall,
		Parent = folder,
	})
	Build.part({
		Name = "CounterTop",
		Size = Vector3.new(counterWidth + 0.6, 0.4, 2.8),
		CFrame = cframe * CFrame.new(0, StandBuilder.CounterHeight - 0.2, counterZ),
		Color = business.Accent,
		Parent = folder,
	})
	-- Little props on the counter.
	Build.part({
		Name = "Jug",
		Size = Vector3.new(1.2, 1.6, 1.2),
		CFrame = cframe * CFrame.new(-4, StandBuilder.CounterHeight + 0.8, counterZ),
		Color = business.Accent,
		Material = Enum.Material.Glass,
		Transparency = 0.25,
		CanCollide = false,
		Parent = folder,
	})
	Build.part({
		Name = "Register",
		Size = Vector3.new(1.6, 1.2, 1.4),
		CFrame = cframe * CFrame.new(4.4, StandBuilder.CounterHeight + 0.6, counterZ),
		Color = Theme.Dark,
		CanCollide = false,
		Parent = folder,
	})

	if tier == 1 then
		for _, x in { -halfWidth + 0.4, halfWidth - 0.4 } do
			Build.part({ Name = "Post", Size = Vector3.new(0.7, awningY, 0.7), CFrame = cframe * CFrame.new(x, awningY / 2, counterZ), Color = Theme.White, Parent = folder })
		end
	else
		local depth = 12 + tier * 2
		local backZ = 1.5 + depth
		Build.part({ Name = "Floor", Size = Vector3.new(halfWidth * 2, 0.2, depth + 5), CFrame = cframe * CFrame.new(0, 0.1, backZ - (depth + 5) / 2), Color = Theme.CardAlt, Parent = folder })
		Build.part({ Name = "BackWall", Size = Vector3.new(halfWidth * 2, awningY, 1), CFrame = cframe * CFrame.new(0, awningY / 2, backZ), Color = business.Wall, Parent = folder })
		for _, x in { -halfWidth + 0.5, halfWidth - 0.5 } do
			-- Side walls cover the back part only, leaving a walkway beside the counter.
			Build.part({ Name = "SideWall", Size = Vector3.new(1, awningY, depth - 4), CFrame = cframe * CFrame.new(x, awningY / 2, backZ - (depth - 4) / 2), Color = business.Wall, Parent = folder })
			Build.part({ Name = "Pillar", Size = Vector3.new(1.2, awningY, 1.2), CFrame = cframe * CFrame.new(x, awningY / 2, counterZ), Color = business.Accent, Parent = folder })
		end
		-- The roof covers the back of the shop only. The strip where the owner stands
		-- to serve stays open to the sky, so the camera is never pushed in by a ceiling.
		local roofFront = 3.5
		Build.part({ Name = "Roof", Size = Vector3.new(halfWidth * 2 + 2, 1, backZ + 1 - roofFront), CFrame = cframe * CFrame.new(0, awningY + 0.5, (backZ + 1 + roofFront) / 2), Color = business.Accent, Parent = folder })
		-- Shelves on the back wall.
		for row = 1, 2 do
			Build.part({ Name = "Shelf", Size = Vector3.new(halfWidth * 1.4, 0.3, 1.4), CFrame = cframe * CFrame.new(0, 2.5 + row * 2.2, backZ - 1.2), Color = business.Accent, Parent = folder })
		end
		roofProp(folder, cframe * CFrame.new(0, awningY + 1, backZ - depth / 2), business)
	end

	-- Awning with stripes.
	local awningDepth = 5.5
	Build.part({
		Name = "Awning",
		Size = Vector3.new(halfWidth * 2 + 1, 0.6, awningDepth),
		CFrame = cframe * CFrame.new(0, awningY, counterZ - 1.2) * CFrame.Angles(math.rad(8), 0, 0),
		Color = cosmetic.Color,
		Material = awningMaterial,
		CanCollide = false,
		Parent = folder,
	})
	local stripes = math.floor(halfWidth)
	for index = 1, stripes do
		local x = -halfWidth + (index - 0.5) * (halfWidth * 2 / stripes)
		if index % 2 == 0 then
			Build.part({
				Name = "Stripe",
				Size = Vector3.new(halfWidth * 2 / stripes, 0.64, awningDepth + 0.02),
				CFrame = cframe * CFrame.new(x, awningY, counterZ - 1.2) * CFrame.Angles(math.rad(8), 0, 0),
				Color = cosmetic.Stripe,
				CanCollide = false,
				Parent = folder,
			})
		end
	end

	-- Shop sign.
	local sign = Build.part({
		Name = "Sign",
		Size = Vector3.new(math.min(halfWidth * 2, 16), 3, 0.6),
		CFrame = cframe * CFrame.new(0, awningY + 2.4, counterZ - 0.6),
		Color = Theme.Dark,
		CanCollide = false,
		Parent = folder,
	})
	Build.label(sign, Enum.NormalId.Front, `{business.Emoji} {ownerName}'s {business.Name}`, { TextColor3 = cosmetic.Color })

	decorations(folder, cframe, profile.Upgrades.Appearance, halfWidth, awningY, business.Accent)

	-- The equipped team stands behind the counter.
	for index, characterId in profile.Equipped do
		local spot = TEAM_SPOTS[index]
		if spot then
			local position = cframe * CFrame.new(spot.X, if tier == 1 then 0 else 0.2, spot.Z)
			local figure = BlockheadBuilder.buildCharacter(characterId, position)
			if figure then
				figure.Parent = folder
			end
		end
	end

	return folder
end

return StandBuilder
