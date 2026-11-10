-- The client's read-only copy of the player's data, plus the one way to ask the
-- server to do something (State.action). The client never changes its own data:
-- it asks, the server decides, and the new state arrives through StateUpdate.

local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local Net = require(Shared.Modules.Net)
local Signal = require(Shared.Modules.Signal)

local State = {
	Profile = nil :: any,
	Rush = { Phase = "Idle", NextAt = 0, EndsAt = 0, Scores = {}, Results = {} } :: any,

	Changed = Signal.new(), -- (profile)
	RushChanged = Signal.new(), -- (rush)
	Notified = Signal.new(), -- (kind, data) server notifications
	Message = Signal.new(), -- (text, kind) local feedback for action results
}

local actionRemote: RemoteFunction

-- Asks the server to perform an action. Returns ok, message.
-- Shows the server's message as a toast unless `quiet` is true.
function State.action(name: string, ...: any): (boolean, string?)
	local args = table.pack(...)
	local ok, success, message = pcall(function()
		return actionRemote:InvokeServer(name, table.unpack(args, 1, args.n))
	end)
	if not ok then
		State.Message:Fire("Connection problem. Try again.", "Error")
		return false, nil
	end
	if message then
		State.Message:Fire(message, if success then "Success" else "Error")
	end
	return success == true, message
end

function State.Start()
	actionRemote = Net.get("Action")

	Net.get("StateUpdate").OnClientEvent:Connect(function(profile)
		State.Profile = profile
		State.Changed:Fire(profile)
	end)
	Net.get("RushUpdate").OnClientEvent:Connect(function(rush)
		State.Rush = rush
		State.RushChanged:Fire(rush)
	end)
	Net.get("Notify").OnClientEvent:Connect(function(kind, data)
		State.Notified:Fire(kind, data or {})
	end)

	-- Ask for our data until it has loaded (the server also pushes it when ready).
	task.spawn(function()
		while not State.Profile do
			pcall(function()
				actionRemote:InvokeServer("GetState")
			end)
			if not State.Profile then
				task.wait(1)
			end
		end
		pcall(function()
			actionRemote:InvokeServer("GetRush")
		end)
	end)
end

return State
