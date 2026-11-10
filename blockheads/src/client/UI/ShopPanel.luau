-- Shop panel: Products (menu items + levels), Business (new shop tiers), Style (awnings).

local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local Theme = require(Shared.Config.Theme)
local Products = require(Shared.Config.Products)
local Businesses = require(Shared.Config.Businesses)
local Cosmetics = require(Shared.Config.Cosmetics)
local Format = require(Shared.Modules.Format)
local Formulas = require(Shared.Modules.Formulas)
local Kit = require(script.Parent.Kit)
local State = require(script.Parent.Parent.Controllers.State)

local ShopPanel = {}

function ShopPanel.create(Hud)
	local content = Hud.newPanel("Shop", "🛒 SHOP")
	local pages, selectTab = Hud.newTabs(content, { "Products", "Business", "Style" })
	local updaters = {}

	-- Products ---------------------------------------------------------------------
	local productScroll = Kit.scroll({ Size = UDim2.fromScale(1, 1), Parent = pages.Products })
	for _, product in Products.List do
		local row
		row = Kit.row(productScroll, product.Order, function()
			local profile = State.Profile
			if not profile then
				return
			end
			if profile.Products[product.Id] then
				State.action("UpgradeProduct", product.Id)
			else
				State.action("BuyProduct", product.Id)
			end
		end)
		row.Icon.Text = product.Emoji
		table.insert(updaters, function(profile)
			local level = profile.Products[product.Id]
			row.Frame.Visible = product.Tier <= profile.BusinessTier + 1
			if product.Tier > profile.BusinessTier then
				row.Title.Text = product.Name
				row.Subtitle.Text = `Requires a {Businesses[product.Tier].Name}`
				Kit.setButton(row.Button, "🔒 Locked", Theme.Grey, false)
			elseif not level then
				row.Title.Text = product.Name
				row.Subtitle.Text = `Sells for {Format.coins(Formulas.productPrice(profile, product.Id))}. Add it to your menu!`
				Kit.setButton(row.Button, `Add {Format.coins(product.UnlockCost)}`, Theme.Green, profile.Coins >= product.UnlockCost)
			else
				local price = Formulas.productPrice(profile, product.Id)
				local seconds = Formulas.productTime(profile, product.Id)
				row.Title.Text = `{product.Name}  Lv {level}`
				row.Subtitle.Text = string.format("Sells for %s  •  %.1fs to make", Format.coins(price), seconds)
				local cost = Formulas.productUpgradeCost(product.Id, level)
				if cost then
					Kit.setButton(row.Button, `Level Up\n{Format.coins(cost)}`, Theme.Blue, profile.Coins >= cost)
				else
					Kit.setButton(row.Button, "MAX", Theme.Grey, false)
				end
			end
		end)
	end

	-- Business ---------------------------------------------------------------------
	local businessScroll = Kit.scroll({ Size = UDim2.fromScale(1, 1), Parent = pages.Business })
	for tier, business in Businesses do
		local row = Kit.row(businessScroll, tier, function()
			State.action("UnlockBusiness")
		end)
		row.Icon.Text = business.Emoji
		row.Title.Text = business.Name
		table.insert(updaters, function(profile)
			if tier <= profile.BusinessTier then
				row.Subtitle.Text = business.Description
				Kit.setButton(row.Button, "✔ Owned", Theme.Grey, false)
			elseif tier == profile.BusinessTier + 1 then
				row.Subtitle.Text = business.Description .. " Unlocks new products."
				Kit.setButton(row.Button, `Open\n{Format.coins(business.UnlockCost)}`, Theme.Green, profile.Coins >= business.UnlockCost)
			else
				row.Subtitle.Text = `Open a {Businesses[tier - 1].Name} first.`
				Kit.setButton(row.Button, "🔒 Locked", Theme.Grey, false)
			end
		end)
	end

	-- Style ------------------------------------------------------------------------
	local styleScroll = Kit.scroll({ Size = UDim2.fromScale(1, 1), Parent = pages.Style })
	for index, cosmetic in Cosmetics.List do
		local row
		row = Kit.row(styleScroll, index, function()
			local profile = State.Profile
			if not profile then
				return
			end
			if profile.Cosmetics[cosmetic.Id] then
				State.action("EquipCosmetic", cosmetic.Id)
			else
				State.action("BuyCosmetic", cosmetic.Id)
			end
		end)
		row.Icon.Text = ""
		row.Icon.BackgroundTransparency = 0
		row.Icon.BackgroundColor3 = cosmetic.Color
		Kit.round(row.Icon, 12)
		Kit.stroke(row.Icon, 3, cosmetic.Stripe)
		row.Title.Text = cosmetic.Name
		table.insert(updaters, function(profile)
			local unlock = cosmetic.Unlock
			if profile.EquippedCosmetic == cosmetic.Id then
				row.Subtitle.Text = "Your shop is wearing this awning."
				Kit.setButton(row.Button, "✔ Equipped", Theme.Grey, false)
			elseif profile.Cosmetics[cosmetic.Id] then
				row.Subtitle.Text = "Owned. Tap to use it on your shop."
				Kit.setButton(row.Button, "Equip", Theme.Blue, true)
			elseif unlock.Kind == "Coins" then
				row.Subtitle.Text = "Awning style for your shop."
				Kit.setButton(row.Button, Format.coins(unlock.Amount), Theme.Green, profile.Coins >= unlock.Amount)
			elseif unlock.Kind == "RushWin" then
				row.Subtitle.Text = "Exclusive! Win 1st place in a Customer Rush."
				Kit.setButton(row.Button, "🏆 Earn it", Theme.Grey, false)
			else
				local have = profile.Stats[unlock.Stat] or 0
				row.Subtitle.Text = `Exclusive! Score {Format.number(unlock.Amount)} total Rush points ({Format.number(have)}).`
				Kit.setButton(row.Button, "🏆 Earn it", Theme.Grey, false)
			end
		end)
	end

	return {
		Frame = content.Parent,
		Opened = function(tab: string?)
			selectTab(tab or "Products")
		end,
		Refresh = function(profile)
			for _, update in updaters do
				update(profile)
			end
		end,
	}
end

return ShopPanel
