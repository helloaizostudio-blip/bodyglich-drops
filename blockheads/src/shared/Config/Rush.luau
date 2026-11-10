-- Customer Rush event tuning.

return {
	FirstDelay = 150, -- seconds after server start before the first rush
	MinInterval = 240, -- seconds between rushes (random between Min and Max)
	MaxInterval = 360,
	Countdown = 10, -- "CUSTOMER RUSH STARTING!" warning time
	Duration = 75, -- seconds of rush

	SpawnIntervalMultiplier = 0.3, -- customers arrive this much faster (lower = faster)
	ExtraQueueSlots = 3,
	PatienceMultiplier = 0.8,

	-- Coin rewards are measured in "average sales" of the winner's own shop,
	-- so a prize is meaningful at every stage of progression.
	RewardServes = { 40, 25, 15 }, -- 1st, 2nd, 3rd
	ParticipationServes = 6, -- everyone else who scored at least MinPointsForReward
	MinPointsForReward = 30,

	-- Exclusive cosmetic for 1st place (see Cosmetics.luau).
	WinnerCosmetic = "Gold",
	MinPointsForWin = 100,
}
