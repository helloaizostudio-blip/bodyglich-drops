"""Every knob in one place. Override any of them in ~/StreamClips/settings.json."""

from pathlib import Path

from .common import DATA, Problem, read_json

DEFAULTS = {
    # finding streams
    "search_suffix": "stream",       # YouTube search = "<topic> <suffix>"; "" for any long video
    "search_when": "today",          # hour | today | week | month
    "max_age_hours": 48,             # watchlist videos older than this are skipped

    # listening
    "scan_model": "tiny",            # Whisper model for the whole stream (fast)
    "caption_model": "base",         # Whisper model for each clip's captions (accurate)
    "language": None,                # None = detect once per stream, or e.g. "en", "hi", "es"
    "block_minutes": 10,             # audio is processed and cached in blocks of this size
    "volume_jump_db": 7.0,           # this much louder than the surrounding minutes = a spike
    "chat_jump": 3.0,                # chat this many times its usual speed = a spike
    "chat_replay": True,             # read YouTube live-chat replays when there is one
    "chat_timeout": 360,

    # picking
    "clips": 3,                      # clips per stream
    "min_len": 15,
    "max_len": 30,                   # short clips keep viewers to the end (Shorts limit is 60)
    "part_minutes": 10,              # transcript window sent to the AI per call
    "part_overlap": 20,              # seconds shared by neighbouring windows
    "picks_per_part": 3,
    "brain_parallel": 3,             # AI calls at the same time
    "min_score": 40,                 # picks below this score are dropped

    # framing
    "width": 1080,
    "height": 1920,
    "layout": "auto",                # auto | stack | crop | blur
    "cam_share": 0.40,               # stack layout: share of the height given to the facecam
    "big_face": 0.13,
    "cam_style": "corner",           # corner = full-screen gameplay + small facecam box; stack = split screen
    "corner_width": 0.36,            # facecam box width as a share of the frame width
    "corner_y": 0.19,                # top edge of the facecam box (below the title bar)
    "corner_side": "left",           # left | right                # face wider than this share of the frame = talking head

    # title bar
    "title_font_file": None,         # None = a bold system font
    "title_size": 56,
    "title_bg": "FFFFFF",
    "title_fg": "111111",
    "title_top": 0.07,               # used when there is no facecam seam to sit on

    # captions
    "cap_font": "Arial Black",
    "cap_size": 86,
    "cap_words": 3,
    "cap_color": "FFFFFF",
    "cap_active": "FFD400",
    "cap_outline": 7,
    "cap_upper": True,
    "cap_y": 0.70,                   # vertical position of the caption line (0 top, 1 bottom)

    # output
    "video_height": 1080,
    "crf": 21,
    "x264_preset": "fast",
    "loudness": -14,                 # LUFS; None to leave the audio as it is
    "audio_kbps": 192,
    "bg_music": True,                # lay a synthesized (copyright-free) beat under the clip
    "bg_music_style": None,          # trap | lofi | hype; None = pick per clip
    "bg_music_db": -10,              # beat volume; it also ducks further while people talk

    # campaign (clipping programs): logo overlay, required caption text and hashtags
    "logo_file": None,               # transparent PNG shown for the whole clip
    "logo_width": 0.70,              # share of the frame width
    "logo_y": 0.84,                  # vertical position of the logo's top edge (0 top, 1 bottom)
    "caption_prefix": "",            # text every post caption must start with
    "required_hashtags": [],         # hashtags every post must include
    "campaign_focus": "",            # default --focus for the picker
    # on-video title bar: a short generic hook instead of the clip's own title (the post title stays specific)
    "title_hooks": ["This happened in GTA 6 😱", "Nobody expected this in GTA 6 😳",
                    "GTA 6 is actually crazy 😭", "Wait for it... 😱"],
}

CAMPAIGNS = Path(__file__).resolve().parents[2] / "campaigns"


def _campaign(name):
    folder = CAMPAIGNS / name
    path = folder / "settings.json"
    if not path.exists():
        found = sorted(p.name for p in CAMPAIGNS.iterdir() if p.is_dir()) if CAMPAIGNS.exists() else []
        raise Problem(f"no campaign '{name}'. Available: {', '.join(found) or 'none'}")
    data = read_json(path)
    unknown = set(data) - set(DEFAULTS)
    if unknown:
        raise Problem(f"{path}: unknown setting(s) {', '.join(sorted(unknown))}")
    if data.get("logo_file"):
        logo = (folder / data["logo_file"]).resolve()
        if not logo.exists():
            raise Problem(f"campaign logo missing: {logo}")
        data["logo_file"] = str(logo)
    return data


def load(cli=None, campaign=None):
    cfg = dict(DEFAULTS)
    if campaign:
        cfg.update(_campaign(campaign))
    user = DATA / "settings.json"
    if user.exists():
        data = read_json(user)
        if not isinstance(data, dict):
            raise Problem(f"{user} is not valid JSON")
        unknown = set(data) - set(DEFAULTS)
        if unknown:
            raise Problem(f"{user}: unknown setting(s) {', '.join(sorted(unknown))}")
        cfg.update(data)
    for key, value in (cli or {}).items():
        if value is not None:
            cfg[key] = value
    return cfg
