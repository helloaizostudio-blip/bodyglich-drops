-- Builds BLOCKHEADS TOWN from code at server start, so the place file needs no
-- hand-built map. Each district is one function; add a new district by writing a
-- new build function and calling it from TownBuilder.build().
--
-- Layout (top-down, Y is up, ground at Y = 0):
--   Main Plaza         centre (0, 0, 0)
--   Business Street    north  (-Z), 8 plots, 4 per side
--   Character Center   east   (+X)
--   Competition Arena  west   (-X)
--   Upgrade District   south  (+Z)

local Lighting = game:GetService("Lighting")
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Workspace = game:GetService("Workspace")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local Make = require(Shared.Modules.Make)
local Theme = require(Shared.Config.Theme)
local GameConfig = require(Shared.Config.GameConfig)
local Characters = require(Shared.Config.Characters)
local BlockheadBuilder = require(Shared.Modules.BlockheadBuilder)
local Build = require(script.Parent.Build)

local TownBuilder = {}

local GROUND_Y = 0.2 -- top surface of every walkable pad
local PLAZA_RADIUS = 58
local DISTRICT_DISTANCE = 140
local DISTRICT_RADIUS = 38

local STREET_START_Z = -58
local PLOT_FIRST_Z = -98
local PLOT_SPACING = 46
local PLOT_X = 36
local PLOT_SIZE = 36
local STREET_END_Z = PLOT_FIRST_Z - PLOT_SPACING * 3 - 38

local STONE = Color3.fromRGB(236, 226, 206)
local PATH = Color3.fromRGB(222, 208, 182)
local ROAD = Color3.fromRGB(92, 98, 120)

local function pad(parent: Instance, name: string, size: Vector3, center: Vector3, color: Color3, material: Enum.Material?)
	return Build.part({
		Name = name,
		Size = size,
		CFrame = CFrame.new(center.X, GROUND_Y - size.Y / 2, center.Z),
		Color = color,
		Material = material or Enum.Material.SmoothPlastic,
		Parent = parent,
	})
end

local function setupLighting()
	Lighting.ClockTime = 14.5
	Lighting.Brightness = 2.6
	Lighting.Ambient = Color3.fromRGB(120, 120, 130)
	Lighting.OutdoorAmbient = Color3.fromRGB(150, 150, 160)
	Lighting.GlobalShadows = true
	Lighting.EnvironmentDiffuseScale = 0.6
	Lighting.EnvironmentSpecularScale = 0.4
	if not Lighting:FindFirstChildOfClass("Atmosphere") then
		Make("Atmosphere", {
			Density = 0.28,
			Offset = 0.1,
			Color = Color3.fromRGB(200, 225, 255),
			Decay = Color3.fromRGB(255, 240, 220),
			Glare = 0.1,
			Haze = 1.2,
			Parent = Lighting,
		})
	end
end

-- Portals teleport a character that touches the pad.
local portalCooldown: { [Player]: number } = {}

local function portal(parent: Instance, cframe: CFrame, title: string, color: Color3, destination: CFrame)
	local model = Make("Model", { Name = title .. " Portal", Parent = parent })
	for _, x in { -3.4, 3.4 } do
		Build.part({
			Name = "Pillar",
			Size = Vector3.new(1.2, 9, 1.2),
			CFrame = cframe * CFrame.new(x, 4.5, 0),
			Color = Theme.White,
			Parent = model,
		})
	end
	local top = Build.part({
		Name = "Top",
		Size = Vector3.new(9, 2, 1.4),
		CFrame = cframe * CFrame.new(0, 10, 0),
		Color = color,
		Parent = model,
	})
	Build.label(top, Enum.NormalId.Front, title)
	Build.label(top, Enum.NormalId.Back, title)
	Build.part({
		Name = "Glow",
		Size = Vector3.new(5.6, 8.6, 0.3),
		CFrame = cframe * CFrame.new(0, 4.5, 0),
		Color = color,
		Material = Enum.Material.Neon,
		Transparency = 0.45,
		CanCollide = false,
		Parent = model,
	})
	local trigger = Build.part({
		Name = "Trigger",
		Size = Vector3.new(5.6, 8, 2),
		CFrame = cframe * CFrame.new(0, 4.2, 0),
		Transparency = 1,
		CanCollide = false,
		Parent = model,
	})
	trigger.Touched:Connect(function(hit)
		local character = hit.Parent
		local player = character and Players:GetPlayerFromCharacter(character)
		if not player then
			return
		end
		local now = os.clock()
		if now - (portalCooldown[player] or 0) < 2 then
			return
		end
		portalCooldown[player] = now
		character:PivotTo(destination)
	end)
end

---------------------------------------------------------------------------------------
-- Districts
---------------------------------------------------------------------------------------

local function buildGround(town: Instance)
	Build.part({
		Name = "Grass",
		Size = Vector3.new(900, 4, 900),
		CFrame = CFrame.new(0, -2, 0),
		Color = Color3.fromRGB(126, 204, 116),
		Material = Enum.Material.Grass,
		Parent = town,
	})

	local decor = Make("Folder", { Name = "Decor", Parent = town })
	local rng = Random.new(2024)
	local placed = 0
	while placed < 46 do
		local x, z = rng:NextNumber(-250, 250), rng:NextNumber(-300, 250)
		local onStreet = z < STREET_START_Z + 10 and math.abs(x) < PLOT_X + PLOT_SIZE / 2 + 8
		local onCross = math.abs(x) < 14 or (math.abs(z) < 14 and z > -40)
		local nearCenter = Vector3.new(x, 0, z).Magnitude < PLAZA_RADIUS + 8
		local nearDistrict = false
		for _, center in { Vector3.new(DISTRICT_DISTANCE, 0, 0), Vector3.new(-DISTRICT_DISTANCE, 0, 0), Vector3.new(0, 0, DISTRICT_DISTANCE) } do
			if (Vector3.new(x, 0, z) - center).Magnitude < DISTRICT_RADIUS + 8 then
				nearDistrict = true
			end
		end
		if not (onStreet or onCross or nearCenter or nearDistrict) then
			Build.tree(decor, Vector3.new(x, 0, z), rng:NextNumber(0.9, 1.5))
			placed += 1
		end
	end
end

local function buildPlaza(town: Instance, result)
	local plaza = Make("Model", { Name = "MainPlaza", Parent = town })
	Build.disc(Vector3.new(0, GROUND_Y - 0.3, 0), PLAZA_RADIUS, 0.6, { Name = "Floor", Color = STONE, Parent = plaza })
	Build.disc(Vector3.new(0, GROUND_Y - 0.25, 0), 30, 0.6, { Name = "Ring", Color = Color3.fromRGB(255, 222, 140), Parent = plaza })

	-- Fountain with a golden Blockhead on top.
	Build.disc(Vector3.new(0, GROUND_Y + 0.8, 0), 11, 1.6, { Name = "FountainRim", Color = Theme.White, Parent = plaza })
	Build.disc(Vector3.new(0, GROUND_Y + 1.0, 0), 9.6, 1.6, {
		Name = "Water",
		Color = Color3.fromRGB(96, 196, 255),
		Material = Enum.Material.Neon,
		Transparency = 0.25,
		CanCollide = false,
		Parent = plaza,
	})
	Build.part({
		Name = "Pedestal",
		Size = Vector3.new(5, 5, 5),
		CFrame = CFrame.new(0, GROUND_Y + 2.5, 0),
		Color = Theme.White,
		Parent = plaza,
	})
	local gold = Color3.fromRGB(255, 200, 50)
	local statue = BlockheadBuilder.build({
		Skin = gold,
		Shirt = gold,
		Pants = gold,
		Eyes = "Dot",
		Mouth = "Grin",
		Hat = "Crown",
		HatColor = gold,
		Scale = 1.5,
	}, CFrame.lookAt(Vector3.new(0, GROUND_Y + 5, 0), Vector3.new(0, GROUND_Y + 5, 10)))
	statue.Name = "GoldenBlockhead"
	statue.Parent = plaza

	-- Spawn points around the fountain.
	for index = 1, 6 do
		local angle = math.rad(40 + index * 14)
		local position = Vector3.new(math.cos(angle) * 22, GROUND_Y + 0.5, math.sin(angle) * 22)
		Make("SpawnLocation", {
			Name = "Spawn" .. index,
			Size = Vector3.new(6, 1, 6),
			CFrame = CFrame.lookAt(position, Vector3.new(0, position.Y, -40)),
			Anchored = true,
			Transparency = 1,
			CanCollide = false,
			Neutral = true,
			Duration = 0,
			Parent = plaza,
		})
	end
	result.PlazaArrival = CFrame.lookAt(Vector3.new(0, GROUND_Y + 3.5, 24), Vector3.new(0, GROUND_Y + 3.5, 0))

	-- Boards, arranged around the southern half so the street view stays open.
	local function around(angleDegrees: number, radius: number): CFrame
		local angle = math.rad(angleDegrees)
		local position = Vector3.new(math.cos(angle) * radius, GROUND_Y, math.sin(angle) * radius)
		return CFrame.lookAt(position, Vector3.new(0, GROUND_Y, 0))
	end

	local _, welcome = Build.board(plaza, around(40, 48), Vector2.new(20, 11), "WELCOME TO BLOCKHEADS TOWN", Theme.Blue)
	welcome.Text = "Run your shop on <b>Business Street</b>\nServe customers. Earn Block Coins.\nCollect every Blockhead.\nWin the <b>Customer Rush</b>!"

	local _, leaderboard = Build.board(plaza, around(135, 48), Vector2.new(20, 13), "🏆 TOP TYCOONS", Theme.Orange)
	leaderboard.Text = "Loading..."
	leaderboard.TextXAlignment = Enum.TextXAlignment.Left
	result.Labels.GlobalLeaderboard = leaderboard

	local _, events = Build.board(plaza, around(68, 48), Vector2.new(18, 9), "📣 EVENTS", Theme.Red)
	events.Text = "Next Customer Rush soon!"
	result.Labels.EventBoard = events

	Build.kiosk(plaza, around(14, 44), "🎁 Daily Reward", "Daily", Theme.Green)
	Build.kiosk(plaza, around(166, 44), "📜 Daily Quests", "Quests", Theme.Purple)

	-- Lamps and benches.
	for index = 0, 11 do
		local angle = math.rad(index * 30 + 15)
		Build.lamp(plaza, Vector3.new(math.cos(angle) * (PLAZA_RADIUS - 3), GROUND_Y, math.sin(angle) * (PLAZA_RADIUS - 3)))
	end

	-- Portals to each district, just beside the walking paths.
	local east = CFrame.lookAt(Vector3.new(DISTRICT_DISTANCE - 22, GROUND_Y + 3.5, 0), Vector3.new(DISTRICT_DISTANCE, GROUND_Y + 3.5, 0))
	local west = CFrame.lookAt(Vector3.new(-DISTRICT_DISTANCE + 22, GROUND_Y + 3.5, 0), Vector3.new(-DISTRICT_DISTANCE, GROUND_Y + 3.5, 0))
	local south = CFrame.lookAt(Vector3.new(0, GROUND_Y + 3.5, DISTRICT_DISTANCE - 22), Vector3.new(0, GROUND_Y + 3.5, DISTRICT_DISTANCE))
	local north = CFrame.lookAt(Vector3.new(0, GROUND_Y + 3.5, STREET_START_Z - 14), Vector3.new(0, GROUND_Y + 3.5, STREET_END_Z))
	portal(plaza, around(-70, 44), "Business Street", Theme.Yellow, north)
	portal(plaza, around(-20, 44), "Character Center", Theme.Pink, east)
	portal(plaza, around(200, 44), "Arena", Theme.Red, west)
	portal(plaza, around(108, 44), "Upgrade District", Theme.Green, south)
	result.Arrivals = { East = east, West = west, South = south, North = north }
end

local function buildStreet(town: Instance, result)
	local street = Make("Model", { Name = "BusinessStreet", Parent = town })
	local length = STREET_START_Z - STREET_END_Z
	local centerZ = (STREET_START_Z + STREET_END_Z) / 2

	pad(street, "Road", Vector3.new(24, 0.4, length), Vector3.new(0, 0, centerZ), ROAD)
	for _, x in { -15, 15 } do
		pad(street, "Sidewalk", Vector3.new(6, 0.4, length), Vector3.new(x, 0, centerZ), STONE)
	end
	-- Dashed centre line.
	local z = STREET_START_Z - 6
	while z > STREET_END_Z + 6 do
		Build.part({
			Name = "Dash",
			Size = Vector3.new(0.8, 0.1, 5),
			CFrame = CFrame.new(0, GROUND_Y + 0.02, z),
			Color = Theme.Yellow,
			CanCollide = false,
			Parent = street,
		})
		z -= 12
	end

	-- Entrance arch.
	for _, x in { -13, 13 } do
		Build.part({
			Name = "ArchPost",
			Size = Vector3.new(2, 16, 2),
			CFrame = CFrame.new(x, GROUND_Y + 8, STREET_START_Z - 2),
			Color = Theme.Dark,
			Parent = street,
		})
	end
	local arch = Build.part({
		Name = "Arch",
		Size = Vector3.new(30, 5, 2),
		CFrame = CFrame.new(0, GROUND_Y + 17, STREET_START_Z - 2),
		Color = Theme.Yellow,
		Parent = street,
	})
	Build.label(arch, Enum.NormalId.Back, "BUSINESS STREET")
	Build.label(arch, Enum.NormalId.Front, "MAIN PLAZA")

	-- Bus stops on the sidewalks between the plots: customers arrive and leave here,
	-- so every shop has a stop a short walk away.
	local stops = {}
	for gap = 0, 4 do
		local stopZ = PLOT_FIRST_Z + PLOT_SPACING / 2 - PLOT_SPACING * gap
		for _, x in { -15, 15 } do
			table.insert(stops, Vector3.new(x, GROUND_Y, stopZ))
			Build.part({
				Name = "BusStopPole",
				Size = Vector3.new(0.4, 7, 0.4),
				CFrame = CFrame.new(x + (if x < 0 then -2.2 else 2.2), GROUND_Y + 3.5, stopZ),
				Color = Theme.White,
				Parent = street,
			})
			local stopSign = Build.part({
				Name = "BusStopSign",
				Size = Vector3.new(0.3, 2.4, 2.4),
				CFrame = CFrame.new(x + (if x < 0 then -2.2 else 2.2), GROUND_Y + 7.6, stopZ),
				Color = Theme.Blue,
				Parent = street,
			})
			Build.label(stopSign, if x < 0 then Enum.NormalId.Right else Enum.NormalId.Left, "🚌")
		end
	end

	-- A covered terminal at the far end of the street.
	local farZ = STREET_END_Z + 2
	Build.part({
		Name = "TerminalRoof",
		Size = Vector3.new(22, 0.8, 8),
		CFrame = CFrame.new(0, GROUND_Y + 10, farZ),
		Color = Theme.Blue,
		Parent = street,
	})
	for _, x in { -10, 10 } do
		Build.part({
			Name = "TerminalPost",
			Size = Vector3.new(1, 10, 1),
			CFrame = CFrame.new(x, GROUND_Y + 5, farZ - 3),
			Color = Theme.White,
			Parent = street,
		})
	end
	local busSign = Build.part({
		Name = "TerminalSign",
		Size = Vector3.new(14, 3, 0.6),
		CFrame = CFrame.new(0, GROUND_Y + 12, farZ + 3),
		Color = Theme.Blue,
		Parent = street,
	})
	Build.label(busSign, Enum.NormalId.Back, "🚌 BUS TERMINAL")

	for row = 0, 3 do
		local rowZ = PLOT_FIRST_Z - PLOT_SPACING * row
		Build.lamp(street, Vector3.new(-17, GROUND_Y, rowZ + PLOT_SPACING / 2))
		Build.lamp(street, Vector3.new(17, GROUND_Y, rowZ + PLOT_SPACING / 2))
	end

	result.BusStops = stops
	result.PlotCFrames = {}
	for index = 1, GameConfig.MaxPlots do
		local row = (index - 1) // 2
		local side = if (index - 1) % 2 == 0 then -1 else 1
		local position = Vector3.new(side * PLOT_X, GROUND_Y, PLOT_FIRST_Z - PLOT_SPACING * row)
		result.PlotCFrames[index] = CFrame.lookAt(position, Vector3.new(0, GROUND_Y, position.Z))
	end
	result.PlotSize = PLOT_SIZE
end

local function districtBase(town: Instance, name: string, center: Vector3, color: Color3, pathFrom: Vector3): Model
	local model = Make("Model", { Name = name, Parent = town })
	Build.disc(Vector3.new(center.X, GROUND_Y - 0.3, center.Z), DISTRICT_RADIUS, 0.6, { Name = "Floor", Color = STONE, Parent = model })
	Build.disc(Vector3.new(center.X, GROUND_Y - 0.25, center.Z), DISTRICT_RADIUS - 6, 0.6, { Name = "Inner", Color = color, Parent = model })

	-- Walking path back to the plaza.
	local delta = center - pathFrom
	local pathLength = delta.Magnitude - DISTRICT_RADIUS + 4
	local direction = delta.Unit
	local middle = pathFrom + direction * (pathLength / 2)
	Build.part({
		Name = "Path",
		Size = Vector3.new(16, 0.4, pathLength),
		CFrame = CFrame.lookAt(Vector3.new(middle.X, GROUND_Y - 0.21, middle.Z), Vector3.new(center.X, GROUND_Y - 0.21, center.Z)),
		Color = PATH,
		Parent = model,
	})
	return model
end

local function buildCharacterCenter(town: Instance, result)
	local center = Vector3.new(DISTRICT_DISTANCE, 0, 0)
	local model = districtBase(town, "CharacterCenter", center, Color3.fromRGB(255, 214, 232), Vector3.new(PLAZA_RADIUS - 4, 0, 0))

	local signCFrame = CFrame.lookAt(Vector3.new(center.X + 30, GROUND_Y, 0), Vector3.new(center.X, GROUND_Y, 0))
	Build.part({
		Name = "BackWall",
		Size = Vector3.new(44, 16, 2),
		CFrame = signCFrame * CFrame.new(0, 8, 0),
		Color = Theme.Pink,
		Parent = model,
	})
	local sign = Build.part({
		Name = "Sign",
		Size = Vector3.new(36, 5, 1),
		CFrame = signCFrame * CFrame.new(0, 13, -1.4),
		Color = Theme.White,
		Parent = model,
	})
	Build.label(sign, Enum.NormalId.Front, "CHARACTER CENTER", { TextColor3 = Theme.Pink })

	-- Display area: one pedestal per character in an arc.
	local display = Make("Folder", { Name = "Display", Parent = model })
	local count = #Characters.List
	for index, character in Characters.List do
		local angle = math.rad(-70 + (index - 1) * (140 / math.max(1, count - 1)))
		local position = Vector3.new(center.X + math.cos(angle) * 22, GROUND_Y, math.sin(angle) * 22)
		local facing = CFrame.lookAt(position, Vector3.new(center.X - 6, GROUND_Y, 0))
		local rarity = Characters.Rarities[character.Rarity]
		local pedestal = Build.part({
			Name = character.Id .. "Pedestal",
			Size = Vector3.new(4.4, 1.6, 4.4),
			CFrame = facing * CFrame.new(0, 0.8, 0),
			Color = rarity.Color,
			Parent = display,
		})
		local figure = BlockheadBuilder.buildCharacter(character.Id, facing * CFrame.new(0, 1.6, 0))
		if figure then
			figure.Parent = display
		end
		Build.billboard(pedestal, character.Name, Vector3.new(0, 9.4, 0), UDim2.fromScale(7, 1.4))
		Build.billboard(pedestal, character.Rarity, Vector3.new(0, 8.2, 0), UDim2.fromScale(5, 1), { TextColor3 = rarity.Color })
	end

	Build.kiosk(model, CFrame.new(center.X - 8, GROUND_Y, 0), "📖 Collection", "Characters:Collection", Theme.Pink)
	Build.kiosk(model, CFrame.new(center.X - 8, GROUND_Y, 12), "🧱 My Team", "Characters:Team", Theme.Blue)
	portal(model, CFrame.lookAt(Vector3.new(center.X - 18, GROUND_Y, -24), Vector3.new(center.X, GROUND_Y, 0)), "Main Plaza", Theme.Blue, result.PlazaArrival)
end

local function buildArena(town: Instance, result)
	local center = Vector3.new(-DISTRICT_DISTANCE, 0, 0)
	local model = districtBase(town, "Arena", center, Color3.fromRGB(255, 196, 170), Vector3.new(-PLAZA_RADIUS + 4, 0, 0))

	Build.disc(Vector3.new(center.X, GROUND_Y - 0.2, 0), 14, 0.6, { Name = "Stage", Color = Theme.Red, Parent = model })

	local boardCFrame = CFrame.lookAt(Vector3.new(center.X - 30, GROUND_Y, 0), Vector3.new(center.X, GROUND_Y, 0))
	local _, board = Build.board(model, boardCFrame, Vector2.new(30, 17), "⚡ CUSTOMER RUSH", Theme.Red)
	board.Text = "The next rush is coming..."
	result.Labels.ArenaBoard = board

	-- Winners' podium.
	result.Labels.Podium = {}
	local podium = {
		{ Place = 1, X = 0, Height = 5, Color = Color3.fromRGB(255, 205, 56) },
		{ Place = 2, X = -6, Height = 3.6, Color = Color3.fromRGB(200, 206, 220) },
		{ Place = 3, X = 6, Height = 2.6, Color = Color3.fromRGB(214, 140, 80) },
	}
	for _, step in podium do
		local block = Build.part({
			Name = "Podium" .. step.Place,
			Size = Vector3.new(6, step.Height, 6),
			CFrame = boardCFrame * CFrame.new(step.X, step.Height / 2, -18),
			Color = step.Color,
			Parent = model,
		})
		Build.label(block, Enum.NormalId.Front, "#" .. step.Place)
		result.Labels.Podium[step.Place] = Build.billboard(block, "---", Vector3.new(0, step.Height / 2 + 7.5, 0), UDim2.fromScale(9, 1.6))
	end

	Build.kiosk(model, CFrame.new(center.X + 14, GROUND_Y, 14), "🏆 Rush Info", "Rush", Theme.Red)
	portal(model, CFrame.lookAt(Vector3.new(center.X + 18, GROUND_Y, -24), Vector3.new(center.X, GROUND_Y, 0)), "Main Plaza", Theme.Blue, result.PlazaArrival)
end

local function buildUpgradeDistrict(town: Instance, result)
	local center = Vector3.new(0, 0, DISTRICT_DISTANCE)
	local model = districtBase(town, "UpgradeDistrict", center, Color3.fromRGB(196, 236, 204), Vector3.new(0, 0, PLAZA_RADIUS - 4))

	local back = CFrame.lookAt(Vector3.new(0, GROUND_Y, center.Z + 30), Vector3.new(0, GROUND_Y, center.Z))
	Build.part({
		Name = "Workshop",
		Size = Vector3.new(48, 14, 6),
		CFrame = back * CFrame.new(0, 7, 2),
		Color = Theme.Green,
		Parent = model,
	})
	local sign = Build.part({
		Name = "Sign",
		Size = Vector3.new(36, 5, 1),
		CFrame = back * CFrame.new(0, 16.5, 0),
		Color = Theme.White,
		Parent = model,
	})
	Build.label(sign, Enum.NormalId.Front, "UPGRADE DISTRICT", { TextColor3 = Theme.Green })

	Build.kiosk(model, back * CFrame.new(-14, 0, -8), "⬆️ Upgrades", "Upgrades", Theme.Green)
	Build.kiosk(model, back * CFrame.new(0, 0, -8), "🏪 New Shops", "Shop:Business", Theme.Orange)
	Build.kiosk(model, back * CFrame.new(14, 0, -8), "🎨 Shop Style", "Shop:Style", Theme.Purple)
	portal(model, CFrame.lookAt(Vector3.new(-24, GROUND_Y, center.Z - 18), Vector3.new(0, GROUND_Y, center.Z)), "Main Plaza", Theme.Blue, result.PlazaArrival)
end

---------------------------------------------------------------------------------------

function TownBuilder.build()
	local result = {
		Labels = {},
		PlotCFrames = {},
		BusStops = {},
		GroundY = GROUND_Y,
	}

	setupLighting()

	-- If the scripts were synced into Studio's default Baseplate template, remove its
	-- floor and its spawn (which would sit inside the fountain). Runtime only.
	for _, name in { "Baseplate", "SpawnLocation" } do
		local leftover = Workspace:FindFirstChild(name)
		if leftover and leftover:IsA("BasePart") then
			leftover:Destroy()
		end
	end

	local town = Make("Folder", { Name = "Town" })
	buildGround(town)
	buildPlaza(town, result)
	buildStreet(town, result)
	buildCharacterCenter(town, result)
	buildArena(town, result)
	buildUpgradeDistrict(town, result)
	town.Parent = Workspace

	result.Town = town
	result.PlotsFolder = Make("Folder", { Name = "ShopPlots", Parent = Workspace })
	result.NPCFolder = Make("Folder", { Name = "NPCs", Parent = Workspace })

	Players.PlayerRemoving:Connect(function(player)
		portalCooldown[player] = nil
	end)
	return result
end

return TownBuilder
