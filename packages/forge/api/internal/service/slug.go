package service

import (
	"regexp"
	"strings"
	"unicode"
)

var nonSlug = regexp.MustCompile(`[^a-z0-9.-]+`)

// SlugFromLabel turns an English label into a Forge slug (identity candidate).
func SlugFromLabel(label string) string {
	s := strings.ToLower(strings.TrimSpace(label))
	var b strings.Builder
	prevDash := false
	for _, r := range s {
		switch {
		case unicode.IsLetter(r) || unicode.IsDigit(r):
			b.WriteRune(r)
			prevDash = false
		case r == '.' || r == '-':
			b.WriteRune(r)
			prevDash = false
		case unicode.IsSpace(r) || r == '_' || r == '/':
			if !prevDash && b.Len() > 0 {
				b.WriteByte('-')
				prevDash = true
			}
		default:
			// drop
		}
	}
	out := strings.Trim(b.String(), "-.")
	out = nonSlug.ReplaceAllString(out, "")
	out = strings.Trim(out, "-.")
	return out
}

// UniqueSlug appends -2, -3, … until exists returns false.
func UniqueSlug(base string, exists func(string) (bool, error)) (string, error) {
	base = strings.Trim(base, "-.")
	if base == "" {
		base = "item"
	}
	candidate := base
	for i := 2; ; i++ {
		taken, err := exists(candidate)
		if err != nil {
			return "", err
		}
		if !taken {
			return candidate, nil
		}
		candidate = base + "-" + itoa(i)
	}
}

func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	var digits []byte
	for n > 0 {
		digits = append([]byte{byte('0' + n%10)}, digits...)
		n /= 10
	}
	return string(digits)
}
