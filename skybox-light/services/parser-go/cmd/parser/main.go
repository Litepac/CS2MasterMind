package main

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/rasmu/skybox-light/parser-go/internal/parser"
)

func main() {
	service := parser.NewService()

	http.HandleFunc("/healthz", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
	})

	http.HandleFunc("/parse", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}

		var req parser.ParseRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "invalid json", http.StatusBadRequest)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(service.Parse(req))
	})

	log.Println("parser-go listening on :8081")
	log.Fatal(http.ListenAndServe(":8081", nil))
}
