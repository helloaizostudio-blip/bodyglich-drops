-- The Blockheads collection: unlocking, buying and equipping characters.
-- Characters are never sold for Robux and never come from paid random rolls:
-- they are bought with coins, befriended as visiting customers, or earned.

local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local Characters = require(Shared.Config.Characters)
local Formulas = require(Shared.Modules.Formulas)
local Signal = require(Shared.Modules.Signal)
local DataService = require(script.Parent.DataService)
local EconomyService = require(script.Parent.EconomyService)
local PlotService = require(script.Parent.PlotService)
local BusinessService = require(script.Parent.BusinessService)
local CustomerService = require(script.Parent.CustomerService)
local RushService = require(script.Parent.RushService)
local Remotes = require(script.Parent.Remotes)

local CharacterService = {
	Unlocked = Signal.new(), -- (player, characterId)
}

local rng = Random.new()

local function unlock(player: Player, characterId: string): boolean
	local profile = DataService.get(player)
	local character = Characters.ById[characterId]
	if not profile or not character or profile.Characters[characterId] then
		return false
	end
	profile.Characters[characterId] = true
	if #profile.Equipped < Formulas.teamSlots(profile) then
		table.insert(profile.Equipped, characterId)
		PlotService.refresh(player)
	end
	DataService.markDirty(player)
	Remotes.notify(player, "CharacterUnlocked", { Id = characterId })
	CharacterService.Unlocked:Fire(player, characterId)
	return true
end

-- Unlocks every character whose stat / business requirement is now met.
local function checkUnlocks(player: Player)
	local profile = DataService.get(player)
	if not profile then
		return
	end
	for _, character in Characters.List do
		if not profile.Characters[character.Id] then
			local rule = character.Unlock
			if rule.Kind == "Starter" then
				unlock(player, character.Id)
			elseif rule.Kind == "Stat" and (profile.Stats[rule.Stat] or 0) >= rule.Amount then
				unlock(player, character.Id)
			elseif rule.Kind == "Tier" and profile.BusinessTier >= rule.Amount then
				unlock(player, character.Id)
			elseif rule.Kind == "Befriend" and (profile.Befriend[character.Id] or 0) >= rule.Amount then
				unlock(player, character.Id)
			end
		end
	end
end

-- Which befriendable character (if any) may visit this player's shop next.
local function pickVisitor(profile): string?
	local candidates = {}
	for _, character in Characters.List do
		if character.Unlock.Kind == "Befriend" and not profile.Characters[character.Id] then
			table.insert(candidates, character.Id)
		end
	end
	if #candidates == 0 then
		return nil
	end
	return candidates[rng:NextInteger(1, #candidates)]
end

local function onServed(player: Player, info)
	local profile = DataService.get(player)
	if not profile then
		return
	end
	local characterId = info.CharacterId
	if characterId and not profile.Characters[characterId] then
		local character = Characters.ById[characterId]
		local count = (profile.Befriend[characterId] or 0) + 1
		profile.Befriend[characterId] = count
		DataService.markDirty(player)
		if count < character.Unlock.Amount then
			Remotes.notify(player, "Toast", {
				Text = `💛 {character.Name} liked that! Friendship {count}/{character.Unlock.Amount}`,
				Kind = "Info",
			})
		end
	end
	checkUnlocks(player)
end

local function buyCharacter(player: Player, characterId: any)
	local profile = DataService.get(player)
	local character = typeof(characterId) == "string" and Characters.ById[characterId]
	if not profile or not character then
		return false, "Unknown character"
	end
	if profile.Characters[characterId] then
		return false, "Already collected"
	end
	if character.Unlock.Kind ~= "Coins" then
		return false, "This Blockhead cannot be bought"
	end
	if not EconomyService.trySpend(player, character.Unlock.Amount) then
		return false, "Not enough coins"
	end
	unlock(player, characterId)
	return true, `{character.Name} joined your collection!`
end

local function equipCharacter(player: Player, characterId: any)
	local profile = DataService.get(player)
	if not profile or typeof(characterId) ~= "string" or not Characters.ById[characterId] then
		return false, "Unknown character"
	end
	if not profile.Characters[characterId] then
		return false, "Not collected yet"
	end
	if table.find(profile.Equipped, characterId) then
		return false, "Already on your team"
	end
	if #profile.Equipped >= Formulas.teamSlots(profile) then
		return false, "Your team is full"
	end
	table.insert(profile.Equipped, characterId)
	DataService.markDirty(player)
	PlotService.refresh(player)
	return true
end

local function unequipCharacter(player: Player, characterId: any)
	local profile = DataService.get(player)
	if not profile or typeof(characterId) ~= "string" then
		return false, "Unknown character"
	end
	local index = table.find(profile.Equipped, characterId)
	if not index then
		return false, "Not on your team"
	end
	table.remove(profile.Equipped, index)
	DataService.markDirty(player)
	PlotService.refresh(player)
	return true
end

function CharacterService.Init() end

function CharacterService.Start()
	CustomerService.VisitorPicker = pickVisitor
	CustomerService.Served:Connect(onServed)
	RushService.Scored:Connect(checkUnlocks)
	BusinessService.Purchased:Connect(function(player, kind)
		if kind == "Business" then
			checkUnlocks(player)
		end
	end)
	DataService.Loaded:Connect(checkUnlocks)

	Remotes.register("BuyCharacter", buyCharacter)
	Remotes.register("EquipCharacter", equipCharacter)
	Remotes.register("UnequipCharacter", unequipCharacter)
end

return CharacterService
