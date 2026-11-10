-- Daily objectives and the daily login reward.
-- Both reset on the UTC day boundary. Quest picks are deterministic per player per
-- day, so rejoining never rerolls them.

local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local Quests = require(Shared.Config.Quests)
local Formulas = require(Shared.Modules.Formulas)
local DataService = require(script.Parent.DataService)
local EconomyService = require(script.Parent.EconomyService)
local BusinessService = require(script.Parent.BusinessService)
local CustomerService = require(script.Parent.CustomerService)
local RushService = require(script.Parent.RushService)
local Remotes = require(script.Parent.Remotes)

local QuestService = {}

local defsById = {}
for _, def in Quests.Pool do
	defsById[def.Id] = def
end

local function today(): number
	return Formulas.dayNumber(os.time())
end

local function ensureQuests(player: Player)
	local profile = DataService.get(player)
	if not profile then
		return
	end
	local day = today()
	if profile.Quests.Day == day and #profile.Quests.List > 0 then
		return
	end
	local rng = Random.new(player.UserId % 1000000 + day * 7)
	local pool = table.clone(Quests.Pool)
	local list = {}
	for _ = 1, math.min(Quests.PerDay, #pool) do
		local def = table.remove(pool, rng:NextInteger(1, #pool))
		table.insert(list, {
			Id = def.Id,
			Goal = def.Goals[rng:NextInteger(1, #def.Goals)],
			Progress = 0,
			Claimed = false,
		})
	end
	profile.Quests = { Day = day, List = list }
	DataService.markDirty(player)
end

-- Adds progress to today's quests listening for `event`.
-- absolute = true means "progress is at least this value" (used for combos).
function QuestService.progress(player: Player, event: string, amount: number, absolute: boolean?)
	local profile = DataService.get(player)
	if not profile or profile.Quests.Day ~= today() then
		return
	end
	for _, quest in profile.Quests.List do
		local def = defsById[quest.Id]
		if def and def.Event == event and quest.Progress < quest.Goal then
			if absolute then
				quest.Progress = math.min(quest.Goal, math.max(quest.Progress, amount))
			else
				quest.Progress = math.min(quest.Goal, quest.Progress + amount)
			end
			if quest.Progress >= quest.Goal then
				Remotes.notify(player, "Toast", { Text = "📜 Daily quest complete! Claim your reward.", Kind = "Reward" })
			end
			DataService.markDirty(player)
		end
	end
end

local function claimQuest(player: Player, index: any)
	local profile = DataService.get(player)
	if not profile or typeof(index) ~= "number" then
		return false, "Bad request"
	end
	ensureQuests(player)
	local quest = profile.Quests.List[index]
	local def = quest and defsById[quest.Id]
	if not quest or not def then
		return false, "Unknown quest"
	end
	if quest.Claimed then
		return false, "Already claimed"
	end
	if quest.Progress < quest.Goal then
		return false, "Not finished yet"
	end
	quest.Claimed = true
	local coins = def.RewardServes * Formulas.serveWorth(profile)
	EconomyService.addCoins(player, coins)
	EconomyService.addXp(player, def.Xp)
	DataService.markDirty(player)
	Remotes.notify(player, "Reward", { Title = "Quest Complete!", Coins = coins })
	return true
end

local function claimDaily(player: Player)
	local profile = DataService.get(player)
	if not profile then
		return false, "Loading"
	end
	local day = today()
	local daily = profile.Daily
	if daily.LastDay >= day then
		return false, "Come back tomorrow!"
	end
	daily.Streak = if daily.LastDay == day - 1 then daily.Streak + 1 else 1
	daily.LastDay = day
	local track = Quests.DailyRewardServes
	local serves = track[(daily.Streak - 1) % #track + 1]
	local coins = math.max(Quests.DailyMinimumCoins, serves * Formulas.serveWorth(profile))
	EconomyService.addCoins(player, coins)
	DataService.markDirty(player)
	Remotes.notify(player, "Reward", { Title = `Daily Reward - Day {daily.Streak}`, Coins = coins })
	return true
end

function QuestService.Init() end

function QuestService.Start()
	DataService.Loaded:Connect(ensureQuests)
	for player in DataService.all() do
		ensureQuests(player)
	end

	CustomerService.Served:Connect(function(player, info)
		if info.By ~= "Player" then
			return
		end
		QuestService.progress(player, "Served", 1)
		if info.Type == "Rich" or info.Type == "VIP" then
			QuestService.progress(player, "ServedSpecial", 1)
		elseif info.Type == "Hungry" then
			QuestService.progress(player, "ServedHungry", 1)
		end
		if info.Fast then
			QuestService.progress(player, "FastServe", 1)
		end
		QuestService.progress(player, "Combo", info.Combo, true)
	end)
	RushService.Scored:Connect(function(player, points)
		QuestService.progress(player, "RushPoints", points)
	end)
	BusinessService.Purchased:Connect(function(player, kind)
		if kind == "Upgrade" or kind == "ProductLevel" then
			QuestService.progress(player, "Upgrade", 1)
		end
	end)

	Remotes.register("ClaimQuest", claimQuest)
	Remotes.register("ClaimDaily", claimDaily)

	-- Roll quests over at midnight UTC for players who stay online.
	task.spawn(function()
		while true do
			task.wait(60)
			for player in DataService.all() do
				ensureQuests(player)
			end
		end
	end)
end

return QuestService
