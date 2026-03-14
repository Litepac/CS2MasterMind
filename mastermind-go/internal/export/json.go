package export

import (
	"encoding/json"
	"os"
	"path/filepath"

	"litepac/mastermind-go/internal/model"
)

func WriteReplayJSON(target string, replay model.ReplayFile) error {
	if err := os.MkdirAll(filepath.Dir(target), 0o755); err != nil {
		return err
	}

	file, err := os.Create(target)
	if err != nil {
		return err
	}
	defer file.Close()

	encoder := json.NewEncoder(file)
	encoder.SetIndent("", "  ")
	return encoder.Encode(replay)
}
