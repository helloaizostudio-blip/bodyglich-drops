-- Turns server notifications into feedback: floating coin popups, sounds, toasts
-- and big banners. Purely cosmetic.

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Workspace = game:GetService("Workspace")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local Make = require(Shared.Modules.Make)
local Theme = require(Shared.Config.Theme)
local Characters = require(Shared.Config.Characters)
local Format = require(Shared.Modules.Format)
local Kit = require(script.Parent.Parent.UI.Kit)
local State = require(script.Parent.State)
local Hud = require(script.Parent.Hud)

local Effects = {}

-- Text that floats up from a point in the world and fades out.
local function floatText(position: Vector3, text: string, color: Color3, scale: number?)
	local anchor = Make("Part", {
		Name = "PopupAnchor",
		Size = Vector3.new(0.2, 0.2, 0.2),
		CFrame = CFrame.new(position + Vector3.new(0, 6, 0)),
		Anchored = true,
		CanCollide = false,
		CanQuery = false,
		CanTouch = false,
		Transparency = 1,
		Parent = Workspace,
	})
	local size = scale or 1
	local gui = Make("BillboardGui", {
		Size = UDim2.fromScale(7 * size, 2 * size),
		StudsOffset = Vector3.new(0, 0, 0),
		AlwaysOnTop = true,
		MaxDistance = 120,
		LightInfluence = 0,
		Parent = anchor,
	})
	local label = Make("TextLabel", {
		Size = UDim2.fromScale(1, 1),
		BackgroundTransparency = 1,
		Text = text,
		TextScaled = true,
		Font = Theme.Font,
		TextColor3 = color,
		Parent = gui,
	})
	local stroke = Make("UIStroke", { Thickness = 3, Color = Theme.Dark, Parent = label })
	Kit.tween(gui, 1.1, { StudsOffset = Vector3.new(0, 4.5, 0) })
	task.delay(0.6, function()
		Kit.tween(label, 0.5, { TextTransparency = 1 })
		Kit.tween(stroke, 0.5, { Transparency = 1 })
	end)
	task.delay(1.2, function()
		anchor:Destroy()
	end)
end

local handlers = {}

function handlers.Sale(data)
	local text = "+" .. Format.coins(data.Amount)
	if data.Fast then
		text ..= " ⚡"
	end
	local special = data.Type == "VIP" or data.Type == "Rich" or data.Type == "Character"
	floatText(data.Position, text, if special then Theme.Orange else Theme.Yellow, if special then 1.3 else 1)
	-- The coin sound climbs in pitch with the combo.
	Kit.playSound("Coin", 1 + math.min(data.Combo or 0, 12) * 0.04)
end

function handlers.Lost(data)
	floatText(data.Position, "😡 Left!", Theme.Red)
	Kit.playSound("Lost")
end

function handlers.Collect(data)
	floatText(data.Position, "+" .. Format.coins(data.Amount) .. " collected", Theme.Green, 1.2)
	Kit.playSound("Purchase")
end

function handlers.Toast(data)
	Hud.toast(data.Text, data.Kind)
end

function handlers.LevelUp(data)
	Hud.banner(`⭐ LEVEL {data.Level}!`, "Bonus +" .. Format.coins(data.Reward), Theme.Purple, "LevelUp")
end

function handlers.Reward(data)
	Hud.banner(data.Title, "+" .. Format.coins(data.Coins), Theme.Green, "LevelUp")
end

function handlers.RushWarning()
	Hud.banner("CUSTOMER RUSH STARTING!", "Race to your shop and serve fast!", Theme.Red, "Rush", 3.2)
end

function handlers.RushResult(data)
	local medal = if data.Rank == 1 then "🥇 1st place!" elseif data.Rank == 2 then "🥈 2nd place!" elseif data.Rank == 3 then "🥉 3rd place!" else `#{data.Rank}`
	local prize = if data.Coins > 0 then `  +{Format.coins(data.Coins)}` else ""
	Hud.banner("Rush over - " .. medal, `{data.Points} points{prize}`, Theme.Orange, "LevelUp", 3.4)
end

function handlers.CharacterUnlocked(data)
	local character = Characters.ById[data.Id]
	if character then
		Hud.banner("NEW BLOCKHEAD!", `{character.Name} - {character.Rarity}`, Characters.Rarities[character.Rarity].Color, "LevelUp", 3.2)
	end
end

function Effects.Start()
	State.Notified:Connect(function(kind, data)
		local handler = handlers[kind]
		if handler then
			handler(data)
		end
	end)
	State.Message:Connect(function(_, kind)
		if kind == "Success" then
			Kit.playSound("Purchase")
		end
	end)
end

return Effects
