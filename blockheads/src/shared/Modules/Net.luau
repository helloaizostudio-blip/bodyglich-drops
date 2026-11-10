-- Network object names. The server creates them (Server/Services/Remotes.luau);
-- the client fetches them with Net.get(name).

local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Net = {
	FolderName = "Remotes",

	-- RemoteEvents, server -> client
	Events = {
		"StateUpdate", -- (profile) the player's own saved state
		"Notify", -- (kind, data) toasts, sale popups, level ups
		"RushUpdate", -- (state) Customer Rush phase, timer and scores
	},
	-- RemoteFunctions, client -> server
	Functions = {
		"Action", -- (actionName, ...args) -> ok: boolean, message: string?
	},
}

function Net.get(name: string): any
	local folder = ReplicatedStorage:WaitForChild(Net.FolderName)
	return folder:WaitForChild(name)
end

return Net
