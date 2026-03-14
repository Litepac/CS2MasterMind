package model

import "time"

type ReplayFile struct {
	SchemaVersion int           `json:"schemaVersion"`
	DemoName      string        `json:"demoName"`
	SourcePath    string        `json:"sourcePath"`
	MapName       string        `json:"mapName,omitempty"`
	Map           *MapMetadata  `json:"map,omitempty"`
	GeneratedAt   time.Time     `json:"generatedAt"`
	Players       []Player      `json:"players,omitempty"`
	Rounds        []Round       `json:"rounds,omitempty"`
	Kills         []KillEvent   `json:"kills,omitempty"`
	Utility       []UtilityEvent `json:"utility,omitempty"`
	BombEvents    []BombEvent   `json:"bombEvents,omitempty"`
	Frames        []Frame       `json:"frames,omitempty"`
}

type MapMetadata struct {
	PosX  float64 `json:"posX"`
	PosY  float64 `json:"posY"`
	Scale float64 `json:"scale"`
	Size  int     `json:"size"`
}

type Player struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Side string `json:"side"`
}

type Round struct {
	Number     int    `json:"number"`
	StartTick  int    `json:"startTick"`
	EndTick    int    `json:"endTick"`
	WinnerSide string `json:"winnerSide"`
	WinReason  string `json:"winReason,omitempty"`
	ScoreCT    int    `json:"scoreCT"`
	ScoreT     int    `json:"scoreT"`
}

type KillEvent struct {
	Tick     int    `json:"tick"`
	Round    int    `json:"round"`
	Attacker string `json:"attacker"`
	Victim   string `json:"victim"`
	Weapon   string `json:"weapon,omitempty"`
	Headshot bool   `json:"headshot,omitempty"`
}

type UtilityEvent struct {
	Tick    int     `json:"tick"`
	EndTick int     `json:"endTick,omitempty"`
	Round   int     `json:"round"`
	Type    string  `json:"type"`
	Player  string  `json:"player,omitempty"`
	WorldX  float64 `json:"worldX,omitempty"`
	WorldY  float64 `json:"worldY,omitempty"`
	X       float64 `json:"x,omitempty"`
	Y       float64 `json:"y,omitempty"`
}

type BombEvent struct {
	Tick   int    `json:"tick"`
	Round  int    `json:"round"`
	Type   string `json:"type"`
	Player string `json:"player,omitempty"`
	Site   string `json:"site,omitempty"`
}

type Frame struct {
	Tick    int           `json:"tick"`
	Players []FramePlayer `json:"players"`
}

type FramePlayer struct {
	PlayerID string  `json:"playerId"`
	WorldX   float64 `json:"worldX"`
	WorldY   float64 `json:"worldY"`
	X        float64 `json:"x"`
	Y        float64 `json:"y"`
	Alive    bool    `json:"alive"`
	Health   int     `json:"health,omitempty"`
	Armor    int     `json:"armor,omitempty"`
}
