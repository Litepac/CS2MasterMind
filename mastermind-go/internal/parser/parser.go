package parser

import (
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	demoinfocs "github.com/markus-wa/demoinfocs-golang/v5/pkg/demoinfocs"
	"github.com/markus-wa/demoinfocs-golang/v5/pkg/demoinfocs/common"
	"github.com/markus-wa/demoinfocs-golang/v5/pkg/demoinfocs/events"
	"github.com/markus-wa/demoinfocs-golang/v5/pkg/demoinfocs/msg"

	"litepac/mastermind-go/internal/maps"
	"litepac/mastermind-go/internal/model"
)

const frameSampleStep = 64

type collector struct {
	replay       model.ReplayFile
	playerIndex  map[string]int
	currentRound int
	matchStarted bool
	scoreCT      int
	scoreT       int
	activeUtility map[string]int
}

func ParseDemo(demoPath string) (model.ReplayFile, error) {
	f, err := os.Open(demoPath)
	if err != nil {
		return model.ReplayFile{}, fmt.Errorf("open demo: %w", err)
	}
	defer f.Close()

	p := demoinfocs.NewParser(f)
	defer p.Close()

	c := &collector{
		replay: model.ReplayFile{
			SchemaVersion: 1,
			DemoName:      filepath.Base(demoPath),
			SourcePath:    demoPath,
			GeneratedAt:   time.Now().UTC(),
		},
		playerIndex:   make(map[string]int),
		activeUtility: make(map[string]int),
	}

	p.RegisterNetMessageHandler(func(m *msg.CSVCMsg_ServerInfo) {
		if strings.TrimSpace(c.replay.MapName) == "" {
			c.replay.MapName = strings.TrimSpace(m.GetMapName())
			if meta, ok := maps.Lookup(c.replay.MapName); ok {
				c.replay.Map = &model.MapMetadata{
					PosX:  meta.PosX,
					PosY:  meta.PosY,
					Scale: meta.Scale,
					Size:  meta.Size,
				}
			}
		}
	})

	p.RegisterEventHandler(func(e events.MatchStart) {
		c.matchStarted = true
		c.currentRound = 0
		c.scoreCT = 0
		c.scoreT = 0
		c.replay.Rounds = nil
		c.replay.Kills = nil
		c.replay.Utility = nil
		c.replay.BombEvents = nil
		c.replay.Frames = nil
		c.activeUtility = make(map[string]int)
	})

	p.RegisterEventHandler(func(e events.RoundFreezetimeEnd) {
		if !c.matchStarted {
			return
		}

		c.currentRound++
		c.replay.Rounds = append(c.replay.Rounds, model.Round{
			Number:    c.currentRound,
			StartTick: p.GameState().IngameTick(),
		})
	})

	p.RegisterEventHandler(func(e events.RoundEnd) {
		if !c.matchStarted || c.currentRound == 0 || e.Reason == events.RoundEndReasonStillInProgress {
			return
		}

		round := &c.replay.Rounds[c.currentRound-1]
		round.EndTick = p.GameState().IngameTick()
		round.WinnerSide = teamString(e.Winner)
		round.WinReason = roundReasonString(e.Reason)
		switch e.Winner {
		case common.TeamCounterTerrorists:
			c.scoreCT++
		case common.TeamTerrorists:
			c.scoreT++
		}
		round.ScoreCT = c.scoreCT
		round.ScoreT = c.scoreT
	})

	p.RegisterEventHandler(func(e events.Kill) {
		c.upsertPlayer(e.Killer)
		c.upsertPlayer(e.Victim)

		c.replay.Kills = append(c.replay.Kills, model.KillEvent{
			Tick:     p.GameState().IngameTick(),
			Round:    c.currentRound,
			Attacker: playerID(e.Killer),
			Victim:   playerID(e.Victim),
			Weapon:   weaponName(e.Weapon),
			Headshot: e.IsHeadshot,
		})
	})

	p.RegisterEventHandler(func(e events.HeExplode) {
		c.appendUtility(p.GameState().IngameTick(), 0, "he", e.Thrower, e.Position.X, e.Position.Y)
	})

	p.RegisterEventHandler(func(e events.FlashExplode) {
		c.appendUtility(p.GameState().IngameTick(), 0, "flash", e.Thrower, e.Position.X, e.Position.Y)
	})

	p.RegisterEventHandler(func(e events.SmokeStart) {
		c.startTimedUtility(p.GameState().IngameTick(), "smoke", e.Thrower, e.Position.X, e.Position.Y, e.GrenadeEntityID)
	})

	p.RegisterEventHandler(func(e events.SmokeExpired) {
		c.finishTimedUtility("smoke", e.GrenadeEntityID, p.GameState().IngameTick())
	})

	p.RegisterEventHandler(func(e events.FireGrenadeStart) {
		c.startTimedUtility(p.GameState().IngameTick(), "molotov", e.Thrower, e.Position.X, e.Position.Y, e.GrenadeEntityID)
	})

	p.RegisterEventHandler(func(e events.FireGrenadeExpired) {
		c.finishTimedUtility("molotov", e.GrenadeEntityID, p.GameState().IngameTick())
	})

	p.RegisterEventHandler(func(e events.BombPlanted) {
		c.upsertPlayer(e.Player)
		c.replay.BombEvents = append(c.replay.BombEvents, model.BombEvent{
			Tick:   p.GameState().IngameTick(),
			Round:  c.currentRound,
			Type:   "plant",
			Player: playerID(e.Player),
			Site:   bombsiteString(e.Site),
		})
	})

	p.RegisterEventHandler(func(e events.BombDefused) {
		c.upsertPlayer(e.Player)
		c.replay.BombEvents = append(c.replay.BombEvents, model.BombEvent{
			Tick:   p.GameState().IngameTick(),
			Round:  c.currentRound,
			Type:   "defuse",
			Player: playerID(e.Player),
			Site:   bombsiteString(e.Site),
		})
	})

	p.RegisterEventHandler(func(e events.BombExplode) {
		c.upsertPlayer(e.Player)
		c.replay.BombEvents = append(c.replay.BombEvents, model.BombEvent{
			Tick:   p.GameState().IngameTick(),
			Round:  c.currentRound,
			Type:   "explode",
			Player: playerID(e.Player),
			Site:   bombsiteString(e.Site),
		})
	})

	p.RegisterEventHandler(func(e events.FrameDone) {
		if !c.matchStarted || c.currentRound == 0 || p.CurrentFrame()%frameSampleStep != 0 {
			return
		}

		participants := p.GameState().Participants().Playing()
		if len(participants) == 0 {
			return
		}

		frame := model.Frame{
			Tick:    p.GameState().IngameTick(),
			Players: make([]model.FramePlayer, 0, len(participants)),
		}

		for _, pl := range participants {
			if !isSidePlayer(pl) {
				continue
			}

			c.upsertPlayer(pl)
			pos := pl.Position()
			nx, ny := maps.Normalize(c.replay.MapName, pos.X, pos.Y)
			frame.Players = append(frame.Players, model.FramePlayer{
				PlayerID: playerID(pl),
				WorldX:   pos.X,
				WorldY:   pos.Y,
				X:        nx,
				Y:        ny,
				Alive:    pl.IsAlive(),
				Health:   pl.Health(),
				Armor:    pl.Armor(),
			})
		}

		if len(frame.Players) == 0 {
			return
		}

		sort.Slice(frame.Players, func(i, j int) bool {
			return frame.Players[i].PlayerID < frame.Players[j].PlayerID
		})
		c.replay.Frames = append(c.replay.Frames, frame)
	})

	if err := p.ParseToEnd(); err != nil {
		return model.ReplayFile{}, fmt.Errorf("parse demo: %w", err)
	}

	for i := range c.replay.Rounds {
		if c.replay.Rounds[i].EndTick == 0 && len(c.replay.Frames) > 0 {
			c.replay.Rounds[i].EndTick = c.replay.Frames[len(c.replay.Frames)-1].Tick
		}
	}

	sort.Slice(c.replay.Players, func(i, j int) bool {
		return c.replay.Players[i].ID < c.replay.Players[j].ID
	})

	return c.replay, nil
}

func (c *collector) appendUtility(tick, endTick int, utilityType string, player *common.Player, x, y float64) int {
	c.upsertPlayer(player)
	nx, ny := maps.Normalize(c.replay.MapName, x, y)
	c.replay.Utility = append(c.replay.Utility, model.UtilityEvent{
		Tick:    tick,
		EndTick: endTick,
		Round:   c.currentRound,
		Type:    utilityType,
		Player:  playerID(player),
		WorldX:  x,
		WorldY:  y,
		X:       nx,
		Y:       ny,
	})
	return len(c.replay.Utility) - 1
}

func (c *collector) startTimedUtility(tick int, utilityType string, player *common.Player, x, y float64, entityID int) {
	index := c.appendUtility(tick, 0, utilityType, player, x, y)
	if entityID > 0 {
		c.activeUtility[utilityKey(utilityType, entityID)] = index
	}
}

func (c *collector) finishTimedUtility(utilityType string, entityID, tick int) {
	if entityID <= 0 {
		return
	}
	key := utilityKey(utilityType, entityID)
	index, ok := c.activeUtility[key]
	if !ok || index < 0 || index >= len(c.replay.Utility) {
		return
	}
	c.replay.Utility[index].EndTick = tick
	delete(c.activeUtility, key)
}

func (c *collector) upsertPlayer(pl *common.Player) {
	if pl == nil || strings.TrimSpace(pl.Name) == "" || !isSidePlayer(pl) {
		return
	}

	id := playerID(pl)
	side := teamString(playerTeam(pl))
	if idx, ok := c.playerIndex[id]; ok {
		c.replay.Players[idx].Name = pl.Name
		c.replay.Players[idx].Side = side
		return
	}

	c.playerIndex[id] = len(c.replay.Players)
	c.replay.Players = append(c.replay.Players, model.Player{
		ID:   id,
		Name: pl.Name,
		Side: side,
	})
}

func playerID(pl *common.Player) string {
	if pl == nil {
		return ""
	}
	if pl.SteamID64 != 0 {
		return fmt.Sprintf("%d", pl.SteamID64)
	}
	if pl.UserID != 0 {
		return fmt.Sprintf("userid:%d", pl.UserID)
	}
	return strings.TrimSpace(pl.Name)
}

func playerTeam(pl *common.Player) common.Team {
	if pl == nil {
		return common.TeamUnassigned
	}

	if pl.Team == common.TeamTerrorists || pl.Team == common.TeamCounterTerrorists {
		return pl.Team
	}

	return pl.GetTeam()
}

func isSidePlayer(pl *common.Player) bool {
	team := playerTeam(pl)
	return team == common.TeamTerrorists || team == common.TeamCounterTerrorists
}

func teamString(team common.Team) string {
	switch team {
	case common.TeamCounterTerrorists:
		return "ct"
	case common.TeamTerrorists:
		return "t"
	default:
		return ""
	}
}

func weaponName(eq *common.Equipment) string {
	if eq == nil {
		return ""
	}
	return strings.ToLower(eq.Type.String())
}

func roundReasonString(reason events.RoundEndReason) string {
	switch reason {
	case events.RoundEndReasonTargetBombed:
		return "bomb_exploded"
	case events.RoundEndReasonBombDefused:
		return "bomb_defused"
	case events.RoundEndReasonCTWin:
		return "ct_killed"
	case events.RoundEndReasonTerroristsWin:
		return "t_killed"
	case events.RoundEndReasonTargetSaved:
		return "target_saved"
	case events.RoundEndReasonHostagesRescued:
		return "hostages_rescued"
	case events.RoundEndReasonDraw:
		return "draw"
	default:
		return fmt.Sprintf("reason_%d", reason)
	}
}

func bombsiteString(site events.Bombsite) string {
	switch site {
	case events.BombsiteA:
		return "A"
	case events.BombsiteB:
		return "B"
	default:
		return ""
	}
}

func utilityKey(kind string, entityID int) string {
	return fmt.Sprintf("%s:%d", kind, entityID)
}
