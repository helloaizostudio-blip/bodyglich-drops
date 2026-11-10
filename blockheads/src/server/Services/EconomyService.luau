-- The only place coins and XP are ever granted or spent.

local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local GameConfig = require(Shared.Config.GameConfig)
local Formulas = require(Shared.Modules.Formulas)
local Signal = require(Shared.Modules.Signal)
local DataService = require(script.Parent.DataService)
local Remotes = require(script.Parent.Remotes)

local EconomyService = {
	LeveledUp = Signal.new(), -- (player, newLevel)
}

-- Adds coins that count as earnings (sales, rewards).
function EconomyService.addCoins(player: Player, amount: number): boolean
	local profile = DataService.get(player)
	if not profile or amount ~= amount or amount <= 0 then
		return false
	end
	amount = math.floor(amount)
	profile.Coins += amount
	profile.TotalEarned += amount
	DataService.markDirty(player)
	return true
end

-- Spends coins if the player can afford it. Returns false (and changes nothing) if not.
function EconomyService.trySpend(player: Player, amount: number): boolean
	local profile = DataService.get(player)
	if not profile or amount ~= amount or amount < 0 then
		return false
	end
	if profile.Coins < amount then
		return false
	end
	profile.Coins -= amount
	DataService.markDirty(player)
	return true
end

function EconomyService.addXp(player: Player, amount: number)
	local profile = DataService.get(player)
	if not profile or amount <= 0 then
		return
	end
	profile.XP += amount * (1 + Formulas.bonuses(profile).Xp)
	local leveled = false
	while profile.XP >= Formulas.xpForLevel(profile.Level) do
		profile.XP -= Formulas.xpForLevel(profile.Level)
		profile.Level += 1
		leveled = true
		local reward = Formulas.serveWorth(profile) * GameConfig.LevelUpRewardServes
		EconomyService.addCoins(player, reward)
		Remotes.notify(player, "LevelUp", { Level = profile.Level, Reward = reward })
	end
	if leveled then
		EconomyService.LeveledUp:Fire(player, profile.Level)
	end
	DataService.markDirty(player)
end

function EconomyService.Init() end
function EconomyService.Start() end

return EconomyService
