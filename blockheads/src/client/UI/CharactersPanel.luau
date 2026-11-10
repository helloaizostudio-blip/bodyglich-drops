-- Characters panel: "Team" (equip collected Blockheads) and "Collection" (all of
-- them, how to get each one, and the buy button for coin characters).

local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local Theme = require(Shared.Config.Theme)
local Characters = require(Shared.Config.Characters)
local Businesses = require(Shared.Config.Businesses)
local Format = require(Shared.Modules.Format)
local Formulas = require(Shared.Modules.Formulas)
local BlockheadBuilder = require(Shared.Modules.BlockheadBuilder)
local Kit = require(script.Parent.Kit)
local State = require(script.Parent.Parent.Controllers.State)

local CharactersPanel = {}

local STAT_TEXT = {
	Served = "Serve %s customers",
	RushPoints = "Score %s total Rush points",
	RushWins = "Win %s Customer Rushes",
}

local function bonusText(character): string
	local parts = {}
	for kind, amount in character.Bonus do
		table.insert(parts, `+{Format.percent(amount)} {Characters.BonusLabels[kind] or kind}`)
	end
	table.sort(parts)
	return table.concat(parts, ", ")
end

-- Replaces a row's emoji icon with the character's face (or a mystery silhouette).
local function portrait(row, character)
	row.Icon.Text = ""
	local face = Kit.frame({
		Name = "Face",
		Size = UDim2.fromScale(1, 1),
		BackgroundColor3 = character.Look.Skin,
		Parent = row.Icon,
	})
	Kit.round(face, 12)
	Kit.stroke(face, 3, Characters.Rarities[character.Rarity].Color)
	BlockheadBuilder.drawFace(face, character.Look)
	local mystery = Kit.frame({
		Name = "Mystery",
		Size = UDim2.fromScale(1, 1),
		BackgroundColor3 = Theme.Dark,
		Visible = false,
		ZIndex = 5,
		Parent = row.Icon,
	})
	Kit.round(mystery, 12)
	Kit.title({ Size = UDim2.fromScale(1, 1), Text = "?", TextSize = 34, ZIndex = 6, Parent = mystery })
	return mystery
end

function CharactersPanel.create(Hud)
	local content = Hud.newPanel("Characters", "🧱 BLOCKHEADS")
	local pages, selectTab = Hud.newTabs(content, { "Team", "Collection" })
	local updaters = {}

	-- Team -------------------------------------------------------------------------
	local teamInfo = Kit.text({
		Size = UDim2.new(1, 0, 0, 40),
		TextSize = 15,
		Font = Theme.BodyFont,
		Parent = pages.Team,
	})
	local teamScroll = Kit.scroll({ Size = UDim2.new(1, 0, 1, -44), Position = UDim2.fromOffset(0, 44), Parent = pages.Team })
	for _, character in Characters.List do
		local row = Kit.row(teamScroll, character.Order, function()
			local profile = State.Profile
			if not profile then
				return
			end
			if table.find(profile.Equipped, character.Id) then
				State.action("UnequipCharacter", character.Id)
			else
				State.action("EquipCharacter", character.Id)
			end
		end)
		portrait(row, character)
		row.Title.Text = character.Name
		row.Title.TextColor3 = Characters.Rarities[character.Rarity].Color
		row.Subtitle.Text = `{character.Rarity}  •  {bonusText(character)}`
		table.insert(updaters, function(profile)
			row.Frame.Visible = profile.Characters[character.Id] == true
			local onTeam = table.find(profile.Equipped, character.Id) ~= nil
			local full = #profile.Equipped >= Formulas.teamSlots(profile)
			if onTeam then
				row.Frame.LayoutOrder = character.Order - 100
				Kit.setButton(row.Button, "Remove", Theme.Red, true)
			else
				row.Frame.LayoutOrder = character.Order
				Kit.setButton(row.Button, if full then "Team Full" else "Add to Team", Theme.Green, not full)
			end
		end)
	end
	table.insert(updaters, function(profile)
		local parts = {}
		for kind, amount in Formulas.bonuses(profile) do
			if amount > 0 then
				table.insert(parts, `+{Format.percent(amount)} {Characters.BonusLabels[kind] or kind}`)
			end
		end
		table.sort(parts)
		local slots = Formulas.teamSlots(profile)
		teamInfo.Text = `Team {#profile.Equipped}/{slots}  (bigger shops unlock more slots)\nBonuses: {if #parts > 0 then table.concat(parts, ", ") else "none"}`
	end)

	-- Collection -------------------------------------------------------------------
	local collectionInfo = Kit.text({
		Size = UDim2.new(1, 0, 0, 24),
		TextSize = 16,
		Parent = pages.Collection,
	})
	local collectionScroll = Kit.scroll({ Size = UDim2.new(1, 0, 1, -28), Position = UDim2.fromOffset(0, 28), Parent = pages.Collection })
	for _, character in Characters.List do
		local row = Kit.row(collectionScroll, character.Order, function()
			State.action("BuyCharacter", character.Id)
		end)
		local mystery = portrait(row, character)
		row.Title.TextColor3 = Characters.Rarities[character.Rarity].Color
		table.insert(updaters, function(profile)
			local owned = profile.Characters[character.Id] == true
			local rule = character.Unlock
			mystery.Visible = not owned
			row.Title.Text = `{character.Name}  •  {character.Rarity}`
			if owned then
				row.Subtitle.Text = `{character.Personality}. {character.Description}`
				Kit.setButton(row.Button, "✔ Collected", Theme.Grey, false)
			elseif rule.Kind == "Coins" then
				row.Subtitle.Text = `{character.Personality}. {bonusText(character)}`
				Kit.setButton(row.Button, Format.coins(rule.Amount), Theme.Green, profile.Coins >= rule.Amount)
			elseif rule.Kind == "Befriend" then
				local count = profile.Befriend[character.Id] or 0
				row.Subtitle.Text = `Visits shops as a 💛 customer. Serve them {rule.Amount} times ({count}/{rule.Amount}).`
				Kit.setButton(row.Button, "💛 Befriend", Theme.Grey, false)
			elseif rule.Kind == "Stat" then
				local have = profile.Stats[rule.Stat] or 0
				local goal = string.format(STAT_TEXT[rule.Stat] or "Reach %s", Format.number(rule.Amount))
				row.Subtitle.Text = `{goal} ({Format.number(have)}/{Format.number(rule.Amount)}).`
				Kit.setButton(row.Button, "🏆 Earn", Theme.Grey, false)
			elseif rule.Kind == "Tier" then
				row.Subtitle.Text = `Joins when you open a {Businesses[rule.Amount].Name}.`
				Kit.setButton(row.Button, "🏆 Earn", Theme.Grey, false)
			else
				row.Subtitle.Text = character.Description
				Kit.setButton(row.Button, "🔒", Theme.Grey, false)
			end
		end)
	end
	table.insert(updaters, function(profile)
		local owned = 0
		for _, character in Characters.List do
			if profile.Characters[character.Id] then
				owned += 1
			end
		end
		collectionInfo.Text = `Collected {owned} / {#Characters.List} Blockheads`
	end)

	return {
		Frame = content.Parent,
		Opened = function(tab: string?)
			selectTab(tab or "Team")
		end,
		Refresh = function(profile)
			for _, update in updaters do
				update(profile)
			end
		end,
	}
end

return CharactersPanel
