package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"litepac/mastermind-go/internal/export"
	"litepac/mastermind-go/internal/parser"
)

func main() {
	demoPath := flag.String("demo", "", "Path to .dem file")
	outPath := flag.String("out", "", "Output replay JSON path")
	flag.Parse()

	if strings.TrimSpace(*demoPath) == "" {
		fmt.Fprintln(os.Stderr, "missing -demo path")
		os.Exit(2)
	}

	replay, err := parser.ParseDemo(*demoPath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to parse demo: %v\n", err)
		os.Exit(1)
	}

	target := *outPath
	if strings.TrimSpace(target) == "" {
		target = filepath.Join("output", strings.TrimSuffix(filepath.Base(*demoPath), filepath.Ext(*demoPath))+".mastermind.replay.json")
	}

	if err := export.WriteReplayJSON(target, replay); err != nil {
		fmt.Fprintf(os.Stderr, "failed to write replay: %v\n", err)
		os.Exit(1)
	}

	summary, _ := json.MarshalIndent(map[string]any{
		"demo":       replay.DemoName,
		"output":     target,
		"map":        replay.MapName,
		"players":    len(replay.Players),
		"rounds":     len(replay.Rounds),
		"kills":      len(replay.Kills),
		"utility":    len(replay.Utility),
		"bombEvents": len(replay.BombEvents),
		"frames":     len(replay.Frames),
	}, "", "  ")
	fmt.Println(string(summary))
}
