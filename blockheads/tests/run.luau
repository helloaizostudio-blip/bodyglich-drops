-- End-to-end smoke test. Build the place first, then run from the blockheads folder:
--
--   rojo build -o build/Blockheads.rbxlx
--   lune run tests/run.luau
--
-- It boots the real server, joins fake players, runs the real client UI code, plays
-- through the core loop and checks security and data-saving behaviour.

local process = require("@lune/process")
local roblox = require("@lune/roblox")
local task = require("@lune/task")
local Harness = require("./harness")

local CFrame, Vector3 = roblox.CFrame, roblox.Vector3

local passed, failed = 0, 0
local function check(condition: any, label: string, detail: any?)
	if condition then
		passed += 1
		print("  ok   " .. label)
	else
		failed += 1
		print("  FAIL " .. label .. (if detail ~= nil then "  -> " .. tostring(detail) else ""))
	end
end
local function section(name: string)
	print("\n== " .. name)
end
local function waitFor(seconds: number, predicate: () -> any): any
	local deadline = os.clock() + seconds
	while os.clock() < deadline do
		local result = predicate()
		if result then
			return result
		end
		task.wait(0.05)
	end
	return predicate()
end

local game = Harness.boot("build/Blockheads.rbxlx")
local Workspace = game:GetService("Workspace")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Shared = ReplicatedStorage.Shared
local Server = game:GetService("ServerScriptService").Server
local Client = game:GetService("StarterPlayer").StarterPlayerScripts.Client

-- Speed the game up so the test runs in about a minute.
local GameConfig = Harness.require(Shared.Config.GameConfig)
local RushConfig = Harness.require(Shared.Config.Rush)
local Formulas = Harness.require(Shared.Modules.Formulas)
GameConfig.BaseSpawnInterval = 0.5
GameConfig.AutosaveInterval = 4
RushConfig.FirstDelay = 99999
RushConfig.Countdown = 1
RushConfig.Duration = 6
RushConfig.MinPointsForWin = 10

---------------------------------------------------------------------------------------
section("Phase 1 - server boot and town")
check(Harness.runScript(Server.Main), "server Main runs without error")
local town = Workspace:FindFirstChild("Town")
local plots = Workspace:FindFirstChild("ShopPlots")
check(town ~= nil, "Workspace.Town exists")
for _, name in { "MainPlaza", "BusinessStreet", "CharacterCenter", "Arena", "UpgradeDistrict" } do
	check(town and town:FindFirstChild(name) ~= nil, "district built: " .. name)
end
check(plots and #plots:GetChildren() == 8, "8 shop plots", plots and #plots:GetChildren())
local partCount = 0
for _, item in Workspace:GetDescendants() do
	if item:IsA("BasePart") then
		partCount += 1
	end
end
print("       world part count: " .. partCount)
check(partCount > 300 and partCount < 4000, "part count is reasonable for mobile")
check(ReplicatedStorage:FindFirstChild("Remotes") ~= nil, "Remotes folder created")

local DataService = Harness.require(Server.Services.DataService)
local store = Harness.state.stores[GameConfig.DataStoreName]

---------------------------------------------------------------------------------------
section("Data safety - outage and session lock (started now, checked at the end)")
-- Player 404: the DataStore fails for the whole session.
Harness.state.failKeys["Player_404"] = true
local outagePlayer = Harness.addPlayer(404, "Outage")
-- Player 303: their save is locked by another live server.
local lockedStore = game:GetService("DataStoreService"):GetDataStore(GameConfig.DataStoreName)
lockedStore.contents["Player_303"] = { Version = 1, Coins = 777777, Session = { JobId = "other-server", Time = os.time() } }
local lockedPlayer = Harness.addPlayer(303, "Locked")
store = Harness.state.stores[GameConfig.DataStoreName]

---------------------------------------------------------------------------------------
section("Phase 1 - joining and plot ownership")
local alice = Harness.addPlayer(101, "Alice")
local bob = Harness.addPlayer(202, "Bob")
Harness.setLocalPlayer(alice)
local profile = waitFor(3, function()
	return DataService.get(alice)
end)
check(profile ~= nil, "Alice's profile loaded")
check(DataService.get(bob) ~= nil, "Bob's profile loaded")
check(profile.Coins == GameConfig.StartingCoins, "new profile starts with StartingCoins", profile.Coins)
task.wait(0.3)

local function plotOf(userId: number)
	for _, plot in plots:GetChildren() do
		if plot:GetAttribute("OwnerUserId") == userId then
			return plot
		end
	end
	return nil
end
local alicePlot, bobPlot = plotOf(101), plotOf(202)
check(alicePlot ~= nil and bobPlot ~= nil and alicePlot ~= bobPlot, "each player owns a different plot")
local function signText(plot): string
	local sign = plot.Stand:FindFirstChild("Sign")
	return sign and sign.Label:FindFirstChildOfClass("TextLabel").Text or ""
end
check(string.find(signText(alicePlot), "Alice's Lemonade Stand", 1, true) ~= nil, "stand sign shows owner + business", signText(alicePlot))
check(alice:FindFirstChild("leaderstats") ~= nil, "leaderstats created")

---------------------------------------------------------------------------------------
section("Phase 5 - client boots (HUD + panels)")
check(Harness.runScript(Client.Main), "client Main runs without error")
local gui = alice.PlayerGui:FindFirstChild("BlockheadsUI")
check(gui ~= nil, "BlockheadsUI ScreenGui created")
local State = Harness.require(Client.Controllers.State)
local Hud = Harness.require(Client.Controllers.Hud)
check(waitFor(3, function()
	return State.Profile
end) ~= nil, "client received its profile")
for _, name in { "Shop", "Upgrades", "Characters", "Quests", "Daily", "Rush", "Settings" } do
	local ok, err = pcall(Hud.open, name)
	check(ok and Hud.OpenName == name, "panel opens and refreshes: " .. name, err)
end
for _, target in { "Shop:Business", "Shop:Style", "Characters:Collection" } do
	local ok, err = pcall(Hud.open, target)
	check(ok, "panel tab opens: " .. target, err)
end
Hud.close()
check(Hud.OpenName == nil, "panel closes")

---------------------------------------------------------------------------------------
section("Phase 2 - customers and serving")
local prompt = alicePlot.ServePoint.ServePrompt
local home = alicePlot.Pad.CFrame * CFrame.new(0, 3, 0.5)
Harness.moveCharacter(alice, home)

local function serveOnce(player, plot): boolean
	local servePrompt = plot.ServePoint.ServePrompt
	if not waitFor(8, function()
		return servePrompt.Enabled
	end) then
		return false
	end
	task.wait(servePrompt.HoldDuration + 0.05)
	if not servePrompt.Enabled then
		return false -- customer left while we were "holding"
	end
	Harness.signal(servePrompt, "Triggered"):Fire(player)
	task.wait(0.05)
	return true
end

check(waitFor(10, function()
	return prompt.Enabled
end), "a customer reaches the counter and the Serve prompt enables")
check(math.abs(prompt.HoldDuration - 2.0) < 0.01, "hold time = Lemonade production time (2.0s)", prompt.HoldDuration)
check(#Workspace.NPCs:GetChildren() > 0, "customer NPC roots exist in Workspace.NPCs")
local npc = Workspace.NPCs:GetChildren()[1]
check(npc:FindFirstChild("Head") ~= nil and npc:FindFirstChild("Bubble") ~= nil, "client built the NPC body and order bubble")

local before = profile.Coins
Harness.signal(prompt, "Triggered"):Fire(alice)
task.wait(0.1)
check(profile.Coins == before, "EXPLOIT: firing the prompt instantly (skipping the hold) pays nothing")

Harness.signal(prompt, "Triggered"):Fire(bob)
task.wait(0.1)
check(profile.Coins == before and DataService.get(bob).Coins == GameConfig.StartingCoins, "EXPLOIT: another player cannot serve at your shop")

check(serveOnce(alice, alicePlot), "legit serve goes through")
check(profile.Coins > before, "serving pays coins", profile.Coins - before)
check(profile.Stats.Served == 1, "Stats.Served counted")
check(profile.Tutorial == 2, "tutorial advanced to step 2", profile.Tutorial)
check(alice:GetAttribute("Combo") == 1, "combo attribute set")
check(waitFor(2, function()
	return State.Profile and State.Profile.Coins == profile.Coins
end), "client state mirrors server coins")

---------------------------------------------------------------------------------------
section("Security - bad requests")
local function rejects(label: string, ...)
	task.wait(0.15)
	local ok = Harness.invoke(bob, ...)
	check(ok == false, "rejected: " .. label)
end
rejects("unknown action", "GiveMeCoins", 1e9)
rejects("non-string action", 12345)
rejects("upgrade with wrong type", "BuyUpgrade", 123)
rejects("unknown upgrade", "BuyUpgrade", "Nope")
rejects("upgrade without coins", "BuyUpgrade", "Staff")
rejects("product from a locked business", "BuyProduct", "ChefsFeast")
rejects("business without coins", "UnlockBusiness")
rejects("character without coins", "BuyCharacter", "ProfessorCube")
rejects("non-purchasable character", "BuyCharacter", "Goldie")
rejects("equip unowned character", "EquipCharacter", "Goldie")
rejects("equip unowned cosmetic", "EquipCosmetic", "Gold")
rejects("buy exclusive cosmetic", "BuyCosmetic", "Gold")
rejects("claim unfinished quest", "ClaimQuest", 1)
rejects("claim quest with bad index", "ClaimQuest", "1")
rejects("bad setting", "SetSetting", "Coins", true)
check(DataService.get(bob).Coins == GameConfig.StartingCoins, "Bob's coins unchanged by rejected requests")
local slowed = false
for _ = 1, 60 do
	local ok, message = Harness.invoke(bob, "GetState")
	if not ok and message == "Slow down!" then
		slowed = true
	end
end
check(slowed, "rate limiter kicks in on spam")

---------------------------------------------------------------------------------------
section("Phase 2 - upgrades and products")
local served = 1
while profile.Coins < 110 and served < 40 do
	if serveOnce(alice, alicePlot) then
		served += 1
	end
end
print(`       served {served} customers, coins = {profile.Coins}, combo = {alice:GetAttribute("Combo")}`)
check(profile.Coins >= 110, "earned enough for first purchases within the first minute of play")
local coinsBefore = profile.Coins
local ok, message = State.action("BuyUpgrade", "Speed")
check(ok and profile.Upgrades.Speed == 1, "BuyUpgrade Speed", message)
check(profile.Coins == coinsBefore - 25, "upgrade cost deducted exactly", coinsBefore - profile.Coins)
check(profile.Tutorial == 3, "tutorial advanced to step 3")
task.wait(0.2)
ok, message = State.action("BuyProduct", "StrawberryLemonade")
check(ok and profile.Products.StrawberryLemonade == 1, "BuyProduct StrawberryLemonade", message)
check(profile.Tutorial == 0, "tutorial finished")
task.wait(0.2)
ok = State.action("BuyProduct", "StrawberryLemonade")
check(not ok, "cannot buy the same product twice")

-- Click a real UI button: first row of the Upgrades panel.
Hud.open("Upgrades")
profile.Coins += 500
DataService.markDirty(alice)
task.wait(0.4)
local upgradesScroll = gui.Root.UpgradesPanel.Content:FindFirstChildOfClass("ScrollingFrame")
local firstRow = nil
for _, child in upgradesScroll:GetChildren() do
	if child:IsA("Frame") and child.LayoutOrder == 1 then
		firstRow = child
	end
end
local rowButton = firstRow and firstRow:FindFirstChildOfClass("TextButton")
check(rowButton ~= nil and rowButton.Active, "Upgrades row button is enabled when affordable")
if rowButton then
	Harness.signal(rowButton, "Activated"):Fire()
	task.wait(0.4)
end
check(profile.Upgrades.Speed == 2, "clicking the UI button bought the upgrade", profile.Upgrades.Speed)
Hud.close()

---------------------------------------------------------------------------------------
section("Phase 3 - characters, business tiers, cosmetics")
profile.Coins += 20000
task.wait(0.2)
ok, message = State.action("UnlockBusiness")
check(ok and profile.BusinessTier == 2, "UnlockBusiness -> Burger Shop", message)
check(profile.Products.ClassicBurger == 1, "new business grants its starter product")
task.wait(0.3)
check(string.find(signText(alicePlot), "Burger Shop", 1, true) ~= nil, "stand rebuilt as Burger Shop", signText(alicePlot))
ok, message = State.action("BuyCharacter", "Lemmy")
check(ok and profile.Characters.Lemmy == true, "BuyCharacter Lemmy", message)
check(table.find(profile.Equipped, "Lemmy") ~= nil, "new character auto-joins the team when a slot is free")
check(math.abs(Formulas.bonuses(profile).Speed - 0.03) < 1e-6, "character bonus applies")
task.wait(0.2)
ok = State.action("UnequipCharacter", "Lemmy")
check(ok and #profile.Equipped == 1, "UnequipCharacter")
task.wait(0.2)
ok = State.action("EquipCharacter", "Lemmy")
check(ok and #profile.Equipped == 2, "EquipCharacter")
task.wait(0.2)
ok, message = State.action("BuyCosmetic", "Berry")
check(ok and profile.EquippedCosmetic == "Berry", "BuyCosmetic Berry", message)
task.wait(0.3)
check(alicePlot.Stand:FindFirstChild("Lemmy") ~= nil and alicePlot.Stand:FindFirstChild("Brix") ~= nil, "team stands in the shop")

-- Befriending: a visiting character customer.
local CustomerService = Harness.require(Server.Services.CustomerService)
profile.Befriend.Dotty = 2
CustomerService.Served:Fire(alice, { Type = "Character", By = "Player", Amount = 1, RushPoints = 0, Fast = false, Combo = 1, CharacterId = "Dotty" })
task.wait(0.1)
check(profile.Characters.Dotty == true, "befriending a visitor 3 times unlocks them")

---------------------------------------------------------------------------------------
section("Retention - daily reward and quests")
task.wait(0.2)
coinsBefore = profile.Coins
ok, message = State.action("ClaimDaily")
check(ok and profile.Coins > coinsBefore and profile.Daily.Streak == 1, "ClaimDaily pays and starts a streak", message)
task.wait(0.2)
ok = State.action("ClaimDaily")
check(not ok, "daily reward cannot be claimed twice in a day")
check(#profile.Quests.List == 3, "3 daily quests assigned", #profile.Quests.List)
profile.Quests.List[1].Progress = profile.Quests.List[1].Goal
task.wait(0.2)
coinsBefore = profile.Coins
ok = State.action("ClaimQuest", 1)
check(ok and profile.Coins > coinsBefore, "finished quest can be claimed")
task.wait(0.2)
ok = State.action("ClaimQuest", 1)
check(not ok, "quest cannot be claimed twice")

---------------------------------------------------------------------------------------
section("Phase 2 - staff and cash register")
profile.Upgrades.Staff = 6
Harness.moveCharacter(alice, CFrame.new(0, 3, 0)) -- walk away to the plaza
local servedBefore = profile.Stats.Served
check(waitFor(12, function()
	return profile.Register > 0
end), "staff serve customers into the register while the owner is away", profile.Register)
check(profile.Stats.Served > servedBefore, "staff serves are counted")
coinsBefore = profile.Coins
Harness.moveCharacter(alice, home)
check(waitFor(3, function()
	return profile.Register == 0 and profile.Coins > coinsBefore
end), "register is collected when the owner returns")
profile.Upgrades.Staff = 0

---------------------------------------------------------------------------------------
section("Phase 4 - Customer Rush")
local RushService = Harness.require(Server.Services.RushService)
RushService.forceStart()
check(waitFor(1.2, function()
	return RushService.getPhase() == "Countdown"
end), "rush countdown begins")
check(waitFor(5, function()
	return RushService.getPhase() == "Active"
end), "rush goes live after the countdown")
check(State.Rush.Phase == "Active", "client is told the rush is live", State.Rush.Phase)
local rushCoins = profile.Coins
local rushServes = 0
while RushService.getPhase() == "Active" do
	if serveOnce(alice, alicePlot) then
		rushServes += 1
	end
end
task.wait(0.5)
print(`       served {rushServes} customers during the rush, rush points = {profile.Stats.RushPoints}`)
check(profile.Stats.RushPoints > 0, "rush points scored")
check(profile.Stats.RushesPlayed == 1, "RushesPlayed counted once", profile.Stats.RushesPlayed)
check(#State.Rush.Results >= 1 and State.Rush.Results[1].UserId == 101, "results list Alice in 1st")
check(profile.Coins > rushCoins, "rush prize paid")
check(profile.Stats.RushWins == 1 and profile.Cosmetics.Gold == true, "winner gets the exclusive Gold awning")
check(DataService.get(bob).Stats.RushesPlayed == 0, "non-participant gets nothing")
check(RushService.getPhase() == "Idle", "rush returns to idle and reschedules")

---------------------------------------------------------------------------------------
section("Data - saving, leaving and rejoining")
check(waitFor(8, function()
	local saved = store.contents["Player_101"]
	return saved and saved.Stats.Served > 0
end), "autosave wrote progress to the DataStore")
local finalCoins = profile.Coins
local finalServed = profile.Stats.Served
Harness.removePlayer(alice)
task.wait(0.5)
local saved = store.contents["Player_101"]
check(saved and saved.Coins == finalCoins and saved.Stats.Served == finalServed, "leaving saves the final state", saved and saved.Coins)
check(saved and saved.Session == nil, "session lock released on leave")
check(DataService.get(alice) == nil, "profile dropped from memory")
check(alicePlot:GetAttribute("OwnerUserId") == 0, "plot freed")
check(#Workspace.NPCs:GetChildren() == 0 or plotOf(101) == nil, "customers cleaned up")

local alice2 = Harness.addPlayer(101, "Alice")
local reloaded = waitFor(3, function()
	return DataService.get(alice2)
end)
check(reloaded ~= nil and reloaded.Coins == finalCoins, "rejoining restores coins", reloaded and reloaded.Coins)
check(reloaded and reloaded.BusinessTier == 2 and reloaded.Characters.Lemmy == true and reloaded.Cosmetics.Gold == true, "rejoining restores business, characters and cosmetics")
check(plotOf(101) ~= nil, "rejoining player gets a plot again")

---------------------------------------------------------------------------------------
section("Data safety - results")
check(waitFor(50, function()
	return Harness.state.kicked[404] ~= nil
end), "player is kicked (not given blank data) when their data cannot load")
check(store.contents["Player_404"] == nil, "nothing was written for the player whose load failed")
check(DataService.get(outagePlayer) == nil, "no profile exists for the failed load")
check(waitFor(40, function()
	return Harness.state.kicked[303] ~= nil
end), "player whose save is locked by another server is kicked")
check(store.contents["Player_303"].Coins == 777777 and store.contents["Player_303"].Session.JobId == "other-server", "locked save was left untouched")
check(DataService.get(lockedPlayer) == nil, "no profile exists for the locked save")

section("Shutdown")
Harness.close()
local bobSaved = store.contents["Player_202"]
check(bobSaved ~= nil and bobSaved.Session == nil, "BindToClose saved and released remaining players")

---------------------------------------------------------------------------------------
print(`\n{passed} passed, {failed} failed, {#Harness.state.errors} script errors`)
process.exit(if failed == 0 and #Harness.state.errors == 0 then 0 else 1)
