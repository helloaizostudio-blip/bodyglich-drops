-- CUSTOMER RUSH: the signature server-wide event.
--
-- Every few minutes customers flood Business Street for ~75 seconds. Every shop gets
-- the same sequence of customer types (same random seed), so the contest is about
-- how well you serve, not luck. Only serves done by the player score - staff do not.
-- Prizes are paid exactly once, from one code path, when the rush ends.

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local Workspace = game:GetService("Workspace")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local RushConfig = require(Shared.Config.Rush)
local Formulas = require(Shared.Modules.Formulas)
local Format = require(Shared.Modules.Format)
local Signal = require(Shared.Modules.Signal)
local DataService = require(script.Parent.DataService)
local EconomyService = require(script.Parent.EconomyService)
local PlotService = require(script.Parent.PlotService)
local BusinessService = require(script.Parent.BusinessService)
local CustomerService = require(script.Parent.CustomerService)
local Remotes = require(script.Parent.Remotes)

local RushService = {
	Scored = Signal.new(), -- (player, points)
	Finished = Signal.new(), -- (results) results = { { Player, Name, Points, Rank, Coins } }
}

local state = {
	Phase = "Idle", -- "Idle" | "Countdown" | "Active"
	RushId = 0,
	NextAt = 0, -- server time the next countdown starts
	EndsAt = 0, -- server time the current phase ends
	Scores = {} :: { [Player]: number },
	LastResults = {} :: { any },
}
local scoresDirty = false
local forceStart = false

local function serverNow(): number
	return Workspace:GetServerTimeNow()
end

local function ranking(): { any }
	local list = {}
	for player, points in state.Scores do
		if player.Parent and points > 0 then
			table.insert(list, { Player = player, Name = player.DisplayName, UserId = player.UserId, Points = points })
		end
	end
	table.sort(list, function(a, b)
		if a.Points == b.Points then
			return a.UserId < b.UserId
		end
		return a.Points > b.Points
	end)
	return list
end

local function snapshot()
	local scores = {}
	for index, entry in ranking() do
		scores[index] = { Name = entry.Name, UserId = entry.UserId, Points = entry.Points }
	end
	local results = {}
	for index, entry in state.LastResults do
		results[index] = { Name = entry.Name, UserId = entry.UserId, Points = entry.Points, Rank = entry.Rank, Coins = entry.Coins }
	end
	return {
		Phase = state.Phase,
		RushId = state.RushId,
		NextAt = state.NextAt,
		EndsAt = state.EndsAt,
		Scores = scores,
		Results = results,
	}
end

local function broadcast()
	scoresDirty = false
	Remotes.Events.RushUpdate:FireAllClients(snapshot())
end

local function updateBoards()
	local labels = PlotService.Town.Labels
	local now = serverNow()

	if state.Phase == "Active" then
		labels.EventBoard.Text = `<b>CUSTOMER RUSH!</b>\n{Format.clock(state.EndsAt - now)} left\nServe as many as you can!`
	elseif state.Phase == "Countdown" then
		labels.EventBoard.Text = `<b>CUSTOMER RUSH STARTING!</b>\nGet to your shop!\n{math.max(0, math.ceil(state.EndsAt - now))}`
	else
		labels.EventBoard.Text = `Next <b>Customer Rush</b> in\n{Format.clock(state.NextAt - now)}`
	end

	local lines = {}
	if state.Phase == "Active" then
		table.insert(lines, `<b>LIVE - {Format.clock(state.EndsAt - now)}</b>`)
		for index, entry in ranking() do
			if index > 6 then
				break
			end
			table.insert(lines, `{index}. {entry.Name} - {entry.Points}`)
		end
		if #lines == 1 then
			table.insert(lines, "No points yet!")
		end
	else
		table.insert(lines, `<b>Next rush in {Format.clock(state.NextAt - now)}</b>`)
		if #state.LastResults > 0 then
			table.insert(lines, "Last rush:")
			for index, entry in state.LastResults do
				if index > 5 then
					break
				end
				table.insert(lines, `{entry.Rank}. {entry.Name} - {entry.Points}`)
			end
		else
			table.insert(lines, "Serve customers at your shop\nto score points!")
		end
	end
	labels.ArenaBoard.Text = table.concat(lines, "\n")
end

local function updatePodium()
	local podium = PlotService.Town.Labels.Podium
	for place = 1, 3 do
		local entry = state.LastResults[place]
		podium[place].Text = if entry then entry.Name else "---"
	end
end

local function scheduleNext(delay: number?)
	state.Phase = "Idle"
	state.NextAt = serverNow() + (delay or math.random(RushConfig.MinInterval, RushConfig.MaxInterval))
	state.EndsAt = 0
end

local function startCountdown()
	state.Phase = "Countdown"
	state.RushId += 1
	state.Scores = {}
	state.EndsAt = serverNow() + RushConfig.Countdown
	Remotes.notifyAll("RushWarning", { Seconds = RushConfig.Countdown })
	broadcast()
end

local function startRush()
	state.Phase = "Active"
	state.EndsAt = serverNow() + RushConfig.Duration
	CustomerService.setRush(true, math.random(1, 2 ^ 30))
	broadcast()
end

local function finishRush()
	CustomerService.setRush(false)

	-- Take the scores out of shared state first so nothing can be rewarded twice.
	local ranked = ranking()
	state.Scores = {}

	local results = {}
	for rank, entry in ranked do
		local player = entry.Player
		local profile = DataService.get(player)
		if profile then
			local serves = RushConfig.RewardServes[rank]
			if not serves and entry.Points >= RushConfig.MinPointsForReward then
				serves = RushConfig.ParticipationServes
			end
			local coins = 0
			if serves then
				coins = serves * Formulas.serveWorth(profile)
				EconomyService.addCoins(player, coins)
			end
			profile.Stats.RushesPlayed += 1
			if rank == 1 and entry.Points >= RushConfig.MinPointsForWin then
				profile.Stats.RushWins += 1
				BusinessService.grantCosmetic(player, RushConfig.WinnerCosmetic)
			end
			BusinessService.checkStatCosmetics(player)
			DataService.markDirty(player)
			Remotes.notify(player, "RushResult", { Rank = rank, Points = entry.Points, Coins = coins })
			table.insert(results, {
				Player = player,
				Name = entry.Name,
				UserId = entry.UserId,
				Points = entry.Points,
				Rank = rank,
				Coins = coins,
			})
		end
	end

	state.LastResults = results
	scheduleNext()
	updatePodium()
	broadcast()
	RushService.Finished:Fire(results)
end

local function onServed(player: Player, info)
	if state.Phase ~= "Active" or info.By ~= "Player" then
		return
	end
	local profile = DataService.get(player)
	if not profile then
		return
	end
	local points = info.RushPoints * (1 + Formulas.bonuses(profile).Rush)
	if info.Fast then
		points *= 1.2
	end
	points = math.floor(points + 0.5)
	state.Scores[player] = (state.Scores[player] or 0) + points
	profile.Stats.RushPoints += points
	DataService.markDirty(player)
	scoresDirty = true
	RushService.Scored:Fire(player, points)
end

-- Starts a rush immediately (for testing / admin tools). Ignored mid-rush.
function RushService.forceStart()
	forceStart = true
end

function RushService.getPhase(): string
	return state.Phase
end

function RushService.Init() end

function RushService.Start()
	CustomerService.Served:Connect(onServed)
	Players.PlayerRemoving:Connect(function(player)
		state.Scores[player] = nil
		scoresDirty = true
	end)
	Remotes.register("GetRush", function(player)
		Remotes.Events.RushUpdate:FireClient(player, snapshot())
		return true
	end)

	-- Studio testing shortcut: set the Workspace attribute "ForceRush" to true
	-- (Explorer > Workspace > Attributes, on the server view) to start a rush now.
	if RunService:IsStudio() then
		Workspace:SetAttribute("ForceRush", false)
		Workspace:GetAttributeChangedSignal("ForceRush"):Connect(function()
			if Workspace:GetAttribute("ForceRush") == true then
				Workspace:SetAttribute("ForceRush", false)
				forceStart = true
			end
		end)
	end

	scheduleNext(RushConfig.FirstDelay)
	updatePodium()

	task.spawn(function()
		local sinceBroadcast = 0
		while true do
			task.wait(0.5)
			local now = serverNow()
			if state.Phase == "Idle" then
				local anyPlayers = next(DataService.all()) ~= nil
				if forceStart or (now >= state.NextAt and anyPlayers) then
					forceStart = false
					startCountdown()
				elseif now >= state.NextAt then
					-- Nobody here: check again shortly instead of rushing an empty town.
					state.NextAt = now + 30
				end
			elseif state.Phase == "Countdown" then
				if now >= state.EndsAt then
					startRush()
				end
			elseif state.Phase == "Active" then
				if now >= state.EndsAt then
					finishRush()
				end
			end

			sinceBroadcast += 0.5
			if scoresDirty and sinceBroadcast >= 1 then
				sinceBroadcast = 0
				broadcast()
			end
			updateBoards()
		end
	end)
end

return RushService
