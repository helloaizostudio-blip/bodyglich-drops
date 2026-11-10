-- Core tuning values for the whole game. Change numbers here, not in the services.

local GameConfig = {
	-- Data
	DataStoreName = "BlockheadsPlayerData_v1",
	LeaderboardStoreName = "BlockheadsTopEarners_v1",
	DataVersion = 1,
	AutosaveInterval = 120, -- seconds between background saves
	SessionLockTimeout = 180, -- seconds before another server may take over a stale session

	-- Server
	MaxPlots = 8,
	StartingCoins = 10,

	-- Customers
	BaseSpawnInterval = 3.6, -- seconds between customers at an un-upgraded stand
	SpawnIntervalJitter = 0.35, -- +/- 35% randomness on each spawn
	BaseQueueSize = 3,
	CustomerWalkSpeed = 13, -- studs per second
	SpecialCustomerBoostPerAppearance = 0.25, -- +25% special customer weight per Curb Appeal level
	MultiOrderTimeFactor = 0.8, -- each extra item in an order adds 80% of its time

	-- Combo: consecutive serves without losing a customer
	ComboBonusPerServe = 0.05,
	ComboMaxBonus = 0.5,
	FastServeWindow = 0.35, -- served within the first 35% of patience = tip
	FastServeTip = 0.25, -- +25% of the order as a tip

	-- Staff + register
	RegisterBaseCapacityServes = 8, -- register holds this many average sales at storage level 0
	RegisterCollectRadius = 10, -- studs from the register for auto-collect

	-- Leveling
	XpBase = 40,
	XpExponent = 1.5,
	LevelUpRewardServes = 5, -- level-up bonus, measured in "average sales"

	-- Character team slots unlocked by business tier
	TeamSlotsByTier = { 1, 2, 2, 3, 3 },

	-- Leaderboards
	GlobalLeaderboardRefresh = 120,
	GlobalLeaderboardSize = 10,

	-- Tutorial
	TutorialReward = 100,
}

return GameConfig
