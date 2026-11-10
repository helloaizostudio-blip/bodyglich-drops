-- Daily objectives and the 7-day login reward track.
-- Coin rewards are measured in "average sales" so they scale with the player's shop.

export type QuestDef = {
	Id: string,
	Text: string, -- %d is replaced by the goal
	Event: string, -- progress event raised by the server (see QuestService)
	Goals: { number }, -- one goal is picked at random
	RewardServes: number,
	Xp: number,
}

local Pool: { QuestDef } = {
	{ Id = "Serve", Text = "Serve %d customers", Event = "Served", Goals = { 25, 40, 60 }, RewardServes = 12, Xp = 40 },
	{ Id = "Special", Text = "Serve %d Rich or VIP customers", Event = "ServedSpecial", Goals = { 3, 5 }, RewardServes = 15, Xp = 50 },
	{ Id = "Combo", Text = "Reach a x%d serve combo", Event = "Combo", Goals = { 8, 10 }, RewardServes = 12, Xp = 40 },
	{ Id = "Fast", Text = "Earn %d fast-service tips", Event = "FastServe", Goals = { 10, 15 }, RewardServes = 12, Xp = 40 },
	{ Id = "Upgrade", Text = "Buy %d upgrades", Event = "Upgrade", Goals = { 2, 3 }, RewardServes = 10, Xp = 30 },
	{ Id = "Rush", Text = "Score %d points in Customer Rushes", Event = "RushPoints", Goals = { 100, 200 }, RewardServes = 20, Xp = 60 },
	{ Id = "Hungry", Text = "Serve %d Hungry customers", Event = "ServedHungry", Goals = { 4, 6 }, RewardServes = 12, Xp = 40 },
}

return {
	Pool = Pool,
	PerDay = 3,

	-- Login streak: day 1..7, then loops. Missing a day resets to day 1.
	DailyRewardServes = { 8, 12, 16, 22, 30, 40, 80 },
	DailyMinimumCoins = 50,
}
