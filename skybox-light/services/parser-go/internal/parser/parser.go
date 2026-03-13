package parser

import (
	"path/filepath"
	"strings"
	"time"
)

type ParseRequest struct {
	DemoPath string
}

type PlayerStat struct {
	Name   string  `json:"name"`
	Steam  string  `json:"steam"`
	Side   string  `json:"side"`
	Kills  int     `json:"kills"`
	Deaths int     `json:"deaths"`
	ADR    float64 `json:"adr"`
}

type MatchSummary struct {
	ID        string       `json:"id"`
	DemoName  string       `json:"demo_name"`
	Map       string       `json:"map"`
	Rounds    int          `json:"rounds"`
	Ticks     int          `json:"ticks"`
	ParsedAt  time.Time    `json:"parsed_at"`
	PlayerBox []PlayerStat `json:"players"`
}

type Service struct{}

func NewService() *Service {
	return &Service{}
}

func inferMap(demoPath string) string {
	lower := strings.ToLower(filepath.Base(demoPath))
	switch {
	case strings.Contains(lower, "mirage"):
		return "de_mirage"
	case strings.Contains(lower, "inferno"):
		return "de_inferno"
	case strings.Contains(lower, "anubis"):
		return "de_anubis"
	default:
		return "de_overpass"
	}
}

func (s *Service) Parse(req ParseRequest) MatchSummary {
	mapName := inferMap(req.DemoPath)

	return MatchSummary{
		ID:       "local-match-001",
		DemoName: filepath.Base(req.DemoPath),
		Map:      mapName,
		Rounds:   24,
		Ticks:    39105,
		ParsedAt: time.Now().UTC(),
		PlayerBox: []PlayerStat{
			{Name: "Sellter", Steam: "76561198000000001", Side: "CT", Kills: 21, Deaths: 14, ADR: 86.3},
			{Name: "Yiksrezo", Steam: "76561198000000002", Side: "CT", Kills: 18, Deaths: 15, ADR: 80.4},
			{Name: "Mag1k3y", Steam: "76561198000000003", Side: "CT", Kills: 16, Deaths: 17, ADR: 74.9},
			{Name: "Tex1y", Steam: "76561198000000004", Side: "CT", Kills: 15, Deaths: 18, ADR: 69.7},
			{Name: "Sdaim", Steam: "76561198000000005", Side: "CT", Kills: 12, Deaths: 19, ADR: 64.1},
			{Name: "Lambert", Steam: "76561198000000006", Side: "T", Kills: 24, Deaths: 13, ADR: 92.2},
			{Name: "Arrozd0ce", Steam: "76561198000000007", Side: "T", Kills: 20, Deaths: 16, ADR: 84.6},
			{Name: "Cadian", Steam: "76561198000000008", Side: "T", Kills: 19, Deaths: 17, ADR: 81.1},
			{Name: "Fl4mus", Steam: "76561198000000009", Side: "T", Kills: 14, Deaths: 18, ADR: 67.8},
			{Name: "Spooke", Steam: "76561198000000010", Side: "T", Kills: 11, Deaths: 18, ADR: 60.3},
		},
	}
}
