-- Minimal Lua signal used for communication between modules on the same side
-- (server-to-server or client-to-client). Not a network object.

local Signal = {}
Signal.__index = Signal

function Signal.new()
	return setmetatable({ _handlers = {} }, Signal)
end

function Signal:Connect(handler)
	local connection = { Connected = true }
	local handlers = self._handlers
	table.insert(handlers, { fn = handler, connection = connection })
	function connection.Disconnect()
		connection.Connected = false
		for index, entry in handlers do
			if entry.connection == connection then
				table.remove(handlers, index)
				break
			end
		end
	end
	return connection
end

function Signal:Fire(...)
	-- Copy so handlers may disconnect while we iterate.
	for _, entry in table.clone(self._handlers) do
		if entry.connection.Connected then
			task.spawn(entry.fn, ...)
		end
	end
end

return Signal
