-- Every gameplay formula in one place. Pure functions of a player profile, so the
-- server (authority) and the client (UI previews) always agree on the numbers.

local Config = script.Parent.Parent.Config
local GameConfig = require(Config.GameConfig)
local Products = require(Config.Products)
local Upgrades = require(Config.Upgrades)
local Characters = require(Config.Characters)

local Formulas = {}

-- Cost to buy the next level of an upgrade, or nil when maxed.
function Formulas.upgradeCost(upgradeId: string, currentLevel: number): number?
	local upgrade = Upgrades.ById[upgradeId]
	if not upgrade or currentLevel >= upgrade.MaxLevel then
		return nil
	end
	return math.floor(upgrade.BaseCost * upgrade.Growth ^ currentLevel + 0.5)
end

-- Cost to raise a product from currentLevel to currentLevel + 1, or nil when maxed.
function Formulas.productUpgradeCost(productId: string, currentLevel: number): number?
	local product = Products.ById[productId]
	if not product or currentLevel >= Products.MaxLevel then
		return nil
	end
	local base = math.max(30, product.Price * Products.UpgradeCostFactor)
	return math.floor(base * Products.UpgradeCostGrowth ^ (currentLevel - 1) + 0.5)
end

-- Sum of the bonuses of all equipped characters, e.g. { Sales = 0.08, Speed = 0.03 }.
function Formulas.bonuses(profile): { [string]: number }
	local totals = { Sales = 0, Speed = 0, Patience = 0, Staff = 0, Xp = 0, Rush = 0 }
	for _, characterId in profile.Equipped do
		local character = Characters.ById[characterId]
		if character and profile.Characters[characterId] then
			for kind, amount in character.Bonus do
				totals[kind] = (totals[kind] or 0) + amount
			end
		end
	end
	return totals
end

function Formulas.productPrice(profile, productId: string): number
	local product = Products.ById[productId]
	local level = profile.Products[productId] or 1
	local price = product.Price
		* (1 + Products.PricePerLevel * (level - 1))
		* (1 + Upgrades.ById.Quality.PerLevel * profile.Upgrades.Quality)
		* (1 + Formulas.bonuses(profile).Sales)
	return math.max(1, math.floor(price + 0.5))
end

function Formulas.productTime(profile, productId: string): number
	local product = Products.ById[productId]
	local speed = 1 - Upgrades.ById.Speed.PerLevel * profile.Upgrades.Speed
	local seconds = product.Time * speed * (1 - Formulas.bonuses(profile).Speed)
	return math.max(0.4, seconds)
end

function Formulas.queueSize(profile): number
	return GameConfig.BaseQueueSize + profile.Upgrades.Capacity
end

function Formulas.spawnInterval(profile): number
	return GameConfig.BaseSpawnInterval * (1 - Upgrades.ById.Capacity.PerLevel * profile.Upgrades.Capacity)
end

function Formulas.patienceMultiplier(profile): number
	return 1 + Formulas.bonuses(profile).Patience
end

-- How many times slower than the player the staff are. nil = no staff hired.
function Formulas.staffTimeMultiplier(profile): number?
	local level = profile.Upgrades.Staff
	if level <= 0 then
		return nil
	end
	local multiplier = Upgrades.StaffSlowest - Upgrades.ById.Staff.PerLevel * level
	return math.max(1, multiplier / (1 + Formulas.bonuses(profile).Staff))
end

-- The products currently on the menu with their order weights.
-- Products from older businesses are ordered less often.
function Formulas.menu(profile): { { Id: string, Weight: number } }
	local menu = {}
	for _, product in Products.List do
		if profile.Products[product.Id] and product.Tier <= profile.BusinessTier then
			local age = profile.BusinessTier - product.Tier
			table.insert(menu, { Id = product.Id, Weight = product.Demand * 0.5 ^ age })
		end
	end
	return menu
end

-- "Average sale": the weighted mean price of the menu. Rewards are expressed in
-- multiples of this so they stay meaningful as the player grows.
function Formulas.serveWorth(profile): number
	local total, weight = 0, 0
	for _, entry in Formulas.menu(profile) do
		total += Formulas.productPrice(profile, entry.Id) * entry.Weight
		weight += entry.Weight
	end
	if weight <= 0 then
		return 1
	end
	return math.max(1, math.floor(total / weight + 0.5))
end

function Formulas.registerCapacity(profile): number
	local capacity = Formulas.serveWorth(profile)
		* GameConfig.RegisterBaseCapacityServes
		* Upgrades.ById.Storage.PerLevel ^ profile.Upgrades.Storage
	return math.floor(capacity + 0.5)
end

-- XP needed to go from `level` to `level + 1`.
function Formulas.xpForLevel(level: number): number
	return math.floor(GameConfig.XpBase * level ^ GameConfig.XpExponent + 0.5)
end

function Formulas.teamSlots(profile): number
	local slots = GameConfig.TeamSlotsByTier[profile.BusinessTier] or 1
	return math.min(slots, Characters.MaxTeamSize)
end

function Formulas.comboBonus(combo: number): number
	return math.min(GameConfig.ComboMaxBonus, GameConfig.ComboBonusPerServe * combo)
end

-- UTC day number, used for daily rewards and daily quests.
function Formulas.dayNumber(unixTime: number): number
	return unixTime // 86400
end

return Formulas
