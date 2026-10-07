package service

import (
	"crypto/rand"
	"fmt"
)

const foundryIDAlphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"

// NewFoundryID returns a 16-character Foundry-style document id.
func NewFoundryID() (string, error) {
	buf := make([]byte, 16)
	if _, err := rand.Read(buf); err != nil {
		return "", fmt.Errorf("foundry id: %w", err)
	}
	out := make([]byte, 16)
	for i := range buf {
		out[i] = foundryIDAlphabet[int(buf[i])%len(foundryIDAlphabet)]
	}
	return string(out), nil
}
