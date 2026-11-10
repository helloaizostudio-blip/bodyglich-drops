-- Business upgrades panel.

local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local Theme = require(Shared.Config.Theme)
local Upgrades = require(Shared.Config.Upgrades)
local Format = require(Shared.Modules.Format)
local Formulas = require(Shared.Modules.Formulas)
local Kit = require(script.Parent.Kit)
local State = require(script.Parent.Parent.Controllers.State)

local UpgradesPanel = {}

function UpgradesPanel.create(Hud)
	local content = Hud.newPanel("Upgrades", "⬆️ UPGRADES")
	local scroll = Kit.scroll({ Size = UDim2.fromScale(1, 1), Parent = content })
	local updaters = {}

	for index, upgrade in Upgrades.List do
		local row = Kit.row(scroll, index, function()
			State.action("BuyUpgrade", upgrade.Id)
		end)
		row.Icon.Text = upgrade.Emoji
		row.Subtitle.Text = upgrade.Description
		table.insert(updaters, function(profile)
			local level = profile.Upgrades[upgrade.Id] or 0
			row.Title.Text = `{upgrade.Name}  {level}/{upgrade.MaxLevel}`
			local cost = Formulas.upgradeCost(upgrade.Id, level)
			if cost then
				Kit.setButton(row.Button, Format.coins(cost), Theme.Green, profile.Coins >= cost)
			else
				Kit.setButton(row.Button, "MAX", Theme.Grey, false)
			end
		end)
	end

	return {
		Frame = content.Parent,
		Refresh = function(profile)
			for _, update in updaters do
				update(profile)
			end
		end,
	}
end

return UpgradesPanel
