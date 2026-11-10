-- Shared look and feel: UI colours, fonts and built-in sound paths.

local Theme = {
	Font = Enum.Font.FredokaOne,
	BodyFont = Enum.Font.GothamMedium,
	BoldFont = Enum.Font.GothamBold,

	Panel = Color3.fromRGB(255, 250, 240),
	PanelStroke = Color3.fromRGB(46, 52, 84),
	Card = Color3.fromRGB(255, 255, 255),
	CardAlt = Color3.fromRGB(244, 238, 226),
	Text = Color3.fromRGB(46, 52, 84),
	SubText = Color3.fromRGB(120, 124, 150),
	White = Color3.fromRGB(255, 255, 255),

	Yellow = Color3.fromRGB(255, 205, 56),
	Green = Color3.fromRGB(76, 201, 110),
	Red = Color3.fromRGB(240, 84, 84),
	Blue = Color3.fromRGB(66, 150, 255),
	Purple = Color3.fromRGB(160, 100, 250),
	Orange = Color3.fromRGB(255, 150, 60),
	Pink = Color3.fromRGB(255, 120, 180),
	Grey = Color3.fromRGB(170, 174, 190),
	Dark = Color3.fromRGB(46, 52, 84),

	-- Sounds that ship inside the Roblox client (no asset IDs needed).
	-- Replace any of these with "rbxassetid://<your id>" when you have your own audio.
	Sounds = {
		Click = "rbxasset://sounds/button.wav",
		Coin = "rbxasset://sounds/electronicpingshort.wav",
		Purchase = "rbxasset://sounds/snap.wav",
		Error = "rbxasset://sounds/uuhhh.mp3",
		LevelUp = "rbxasset://sounds/victory.wav",
		Rush = "rbxasset://sounds/bass.wav",
		Lost = "rbxasset://sounds/splat.wav",
	},
	-- Background music is NOT included. Put a music asset id here to enable it,
	-- e.g. "rbxassetid://1234567890".
	Music = "",
}

return Theme
