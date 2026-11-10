-- Everything a player can buy for their shop: upgrades, products, product levels,
-- new business tiers and awning styles. Also advances the tutorial.
-- All prices come from shared config and are checked here on the server.

local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local GameConfig = require(Shared.Config.GameConfig)
local Businesses = require(Shared.Config.Businesses)
local Products = require(Shared.Config.Products)
local Upgrades = require(Shared.Config.Upgrades)
local Cosmetics = require(Shared.Config.Cosmetics)
local Formulas = require(Shared.Modules.Formulas)
local Signal = require(Shared.Modules.Signal)
local DataService = require(script.Parent.DataService)
local EconomyService = require(script.Parent.EconomyService)
local PlotService = require(script.Parent.PlotService)
local Remotes = require(script.Parent.Remotes)

local BusinessService = {
	Purchased = Signal.new(), -- (player, kind: "Upgrade"|"Product"|"ProductLevel"|"Business"|"Cosmetic", id)
}

local TUTORIAL_STEPS = 3 -- 1 serve a customer, 2 buy an upgrade, 3 unlock a product

-- Marks tutorial step `step` complete if it is the player's current step.
function BusinessService.advanceTutorial(player: Player, step: number)
	local profile = DataService.get(player)
	if not profile or profile.Tutorial ~= step then
		return
	end
	if step >= TUTORIAL_STEPS then
		profile.Tutorial = 0
		EconomyService.addCoins(player, GameConfig.TutorialReward)
		Remotes.notify(player, "Toast", {
			Text = `Tutorial complete! +{GameConfig.TutorialReward} coins`,
			Kind = "Reward",
		})
	else
		profile.Tutorial = step + 1
	end
	DataService.markDirty(player)
end

local function buyUpgrade(player: Player, upgradeId: any)
	local profile = DataService.get(player)
	if not profile or typeof(upgradeId) ~= "string" or not Upgrades.ById[upgradeId] then
		return false, "Unknown upgrade"
	end
	local level = profile.Upgrades[upgradeId] or 0
	local cost = Formulas.upgradeCost(upgradeId, level)
	if not cost then
		return false, "Already maxed"
	end
	if not EconomyService.trySpend(player, cost) then
		return false, "Not enough coins"
	end
	profile.Upgrades[upgradeId] = level + 1
	DataService.markDirty(player)
	if upgradeId == "Appearance" then
		PlotService.refresh(player)
	end
	BusinessService.Purchased:Fire(player, "Upgrade", upgradeId)
	BusinessService.advanceTutorial(player, 2)
	return true, `{Upgrades.ById[upgradeId].Name} is now level {level + 1}!`
end

local function buyProduct(player: Player, productId: any)
	local profile = DataService.get(player)
	local product = typeof(productId) == "string" and Products.ById[productId]
	if not profile or not product then
		return false, "Unknown product"
	end
	if profile.Products[productId] then
		return false, "Already on the menu"
	end
	if product.Tier > profile.BusinessTier then
		return false, `Needs a {Businesses[product.Tier].Name}`
	end
	if not EconomyService.trySpend(player, product.UnlockCost) then
		return false, "Not enough coins"
	end
	profile.Products[productId] = 1
	DataService.markDirty(player)
	BusinessService.Purchased:Fire(player, "Product", productId)
	BusinessService.advanceTutorial(player, 3)
	return true, `{product.Name} added to the menu!`
end

local function upgradeProduct(player: Player, productId: any)
	local profile = DataService.get(player)
	local product = typeof(productId) == "string" and Products.ById[productId]
	if not profile or not product then
		return false, "Unknown product"
	end
	local level = profile.Products[productId]
	if not level then
		return false, "Unlock it first"
	end
	local cost = Formulas.productUpgradeCost(productId, level)
	if not cost then
		return false, "Already maxed"
	end
	if not EconomyService.trySpend(player, cost) then
		return false, "Not enough coins"
	end
	profile.Products[productId] = level + 1
	DataService.markDirty(player)
	BusinessService.Purchased:Fire(player, "ProductLevel", productId)
	return true, `{product.Name} is now level {level + 1}!`
end

local function unlockBusiness(player: Player)
	local profile = DataService.get(player)
	if not profile then
		return false, "Loading"
	end
	local nextTier = profile.BusinessTier + 1
	local business = Businesses[nextTier]
	if not business then
		return false, "You own every business!"
	end
	if not EconomyService.trySpend(player, business.UnlockCost) then
		return false, "Not enough coins"
	end
	profile.BusinessTier = nextTier
	for _, product in Products.List do
		if product.Tier == nextTier and product.UnlockCost == 0 then
			profile.Products[product.Id] = profile.Products[product.Id] or 1
		end
	end
	DataService.markDirty(player)
	PlotService.refresh(player)
	BusinessService.Purchased:Fire(player, "Business", business.Id)
	Remotes.notifyAll("Toast", {
		Text = `{business.Emoji} {player.DisplayName} opened a {business.Name}!`,
		Kind = "Info",
	})
	return true, `Welcome to your new {business.Name}!`
end

local function buyCosmetic(player: Player, cosmeticId: any)
	local profile = DataService.get(player)
	local cosmetic = typeof(cosmeticId) == "string" and Cosmetics.ById[cosmeticId]
	if not profile or not cosmetic then
		return false, "Unknown style"
	end
	if profile.Cosmetics[cosmeticId] then
		return false, "Already owned"
	end
	if cosmetic.Unlock.Kind ~= "Coins" then
		return false, "This style cannot be bought"
	end
	if not EconomyService.trySpend(player, cosmetic.Unlock.Amount) then
		return false, "Not enough coins"
	end
	profile.Cosmetics[cosmeticId] = true
	profile.EquippedCosmetic = cosmeticId
	DataService.markDirty(player)
	PlotService.refresh(player)
	BusinessService.Purchased:Fire(player, "Cosmetic", cosmeticId)
	return true, `{cosmetic.Name} unlocked!`
end

local function equipCosmetic(player: Player, cosmeticId: any)
	local profile = DataService.get(player)
	if not profile or typeof(cosmeticId) ~= "string" or not Cosmetics.ById[cosmeticId] then
		return false, "Unknown style"
	end
	if not profile.Cosmetics[cosmeticId] then
		return false, "Not owned"
	end
	profile.EquippedCosmetic = cosmeticId
	DataService.markDirty(player)
	PlotService.refresh(player)
	return true
end

-- Grants a cosmetic earned through gameplay (rush wins, stats). Idempotent.
function BusinessService.grantCosmetic(player: Player, cosmeticId: string): boolean
	local profile = DataService.get(player)
	local cosmetic = Cosmetics.ById[cosmeticId]
	if not profile or not cosmetic or profile.Cosmetics[cosmeticId] then
		return false
	end
	profile.Cosmetics[cosmeticId] = true
	DataService.markDirty(player)
	Remotes.notify(player, "Toast", { Text = `New shop style unlocked: {cosmetic.Name}!`, Kind = "Reward" })
	return true
end

-- Unlocks cosmetics tied to lifetime stats.
function BusinessService.checkStatCosmetics(player: Player)
	local profile = DataService.get(player)
	if not profile then
		return
	end
	for _, cosmetic in Cosmetics.List do
		local unlock = cosmetic.Unlock
		if unlock.Kind == "Stat" and (profile.Stats[unlock.Stat] or 0) >= unlock.Amount then
			BusinessService.grantCosmetic(player, cosmetic.Id)
		end
	end
end

function BusinessService.Init() end

function BusinessService.Start()
	Remotes.register("BuyUpgrade", buyUpgrade)
	Remotes.register("BuyProduct", buyProduct)
	Remotes.register("UpgradeProduct", upgradeProduct)
	Remotes.register("UnlockBusiness", unlockBusiness)
	Remotes.register("BuyCosmetic", buyCosmetic)
	Remotes.register("EquipCosmetic", equipCosmetic)
end

return BusinessService
