package handler

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/c7d5a6/foundry-kedom-rpg/packages/forge/api/internal/model"
	"github.com/c7d5a6/foundry-kedom-rpg/packages/forge/api/internal/service"
)

// API mounts Forge HTTP routes on mux.
type API struct {
	content *service.Content
	log     *log.Logger
}

func New(content *service.Content, logger *log.Logger) *API {
	if logger == nil {
		logger = log.Default()
	}
	return &API{content: content, log: logger}
}

func (a *API) Mount(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/health", a.health)
	mux.HandleFunc("GET /api/attributes", a.listAttributes)
	mux.HandleFunc("GET /api/attributes/{id}", a.getAttribute)
	mux.HandleFunc("PATCH /api/attributes/{id}", a.patchAttribute)
	mux.HandleFunc("GET /api/skills", a.listSkills)
	mux.HandleFunc("GET /api/skills/{id}", a.getSkill)
	mux.HandleFunc("PATCH /api/skills/{id}", a.patchSkill)
	mux.HandleFunc("GET /api/skills/{id}/specializations", a.listSkillSpecs)
	mux.HandleFunc("GET /api/specializations", a.listSpecs)
	mux.HandleFunc("GET /api/specializations/{id}", a.getSpec)
	mux.HandleFunc("PATCH /api/specializations/{id}", a.patchSpec)
	mux.HandleFunc("GET /api/classes", a.listClasses)
	mux.HandleFunc("GET /api/classes/{id}", a.getClass)
	mux.HandleFunc("PATCH /api/classes/{id}", a.patchClass)
	mux.HandleFunc("GET /api/vocab", a.listVocab)
	mux.HandleFunc("GET /api/vocab/{id}", a.getVocab)
	mux.HandleFunc("PATCH /api/vocab/{id}", a.patchVocab)
	mux.HandleFunc("PUT /api/translations", a.putTranslation)
	mux.HandleFunc("DELETE /api/translations", a.deleteTranslation)
	mux.HandleFunc("GET /api/completeness", a.completeness)
	mux.HandleFunc("GET /api/export/markdown", a.exportMarkdown)
}

func (a *API) health(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (a *API) listAttributes(w http.ResponseWriter, r *http.Request) {
	rows, err := a.content.ListAttributes(r.Context(), locale(r))
	a.respond(w, rows, err)
}

func (a *API) getAttribute(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	row, err := a.content.GetAttribute(r.Context(), id, locale(r))
	a.respond(w, row, err)
}

func (a *API) patchAttribute(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	var in service.UpdateAttributeInput
	if !decode(w, r, &in) {
		return
	}
	row, err := a.content.UpdateAttribute(r.Context(), id, in, locale(r))
	a.respond(w, row, err)
}

func (a *API) listSkills(w http.ResponseWriter, r *http.Request) {
	rows, err := a.content.ListSkills(r.Context(), locale(r))
	a.respond(w, rows, err)
}

func (a *API) getSkill(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	row, err := a.content.GetSkill(r.Context(), id, locale(r))
	a.respond(w, row, err)
}

func (a *API) patchSkill(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	var in service.UpdateSkillInput
	if !decode(w, r, &in) {
		return
	}
	row, err := a.content.UpdateSkill(r.Context(), id, in, locale(r))
	a.respond(w, row, err)
}

func (a *API) listSkillSpecs(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	rows, err := a.content.ListSpecializationsBySkill(r.Context(), id, locale(r))
	a.respond(w, rows, err)
}

func (a *API) listSpecs(w http.ResponseWriter, r *http.Request) {
	rows, err := a.content.ListSpecializations(r.Context(), locale(r))
	a.respond(w, rows, err)
}

func (a *API) getSpec(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	row, err := a.content.GetSpecialization(r.Context(), id, locale(r))
	a.respond(w, row, err)
}

func (a *API) patchSpec(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	var in service.UpdateSpecializationInput
	if !decode(w, r, &in) {
		return
	}
	row, err := a.content.UpdateSpecialization(r.Context(), id, in, locale(r))
	a.respond(w, row, err)
}

func (a *API) listClasses(w http.ResponseWriter, r *http.Request) {
	rows, err := a.content.ListClasses(r.Context(), locale(r))
	a.respond(w, rows, err)
}

func (a *API) getClass(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	row, err := a.content.GetClass(r.Context(), id, locale(r))
	a.respond(w, row, err)
}

func (a *API) patchClass(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	var in service.UpdateClassInput
	if !decode(w, r, &in) {
		return
	}
	row, err := a.content.UpdateClass(r.Context(), id, in, locale(r))
	a.respond(w, row, err)
}

func (a *API) listVocab(w http.ResponseWriter, r *http.Request) {
	kind := strings.TrimSpace(r.URL.Query().Get("kind"))
	if kind == "" {
		rows, err := a.content.ListVocab(r.Context(), locale(r))
		a.respond(w, rows, err)
		return
	}
	rows, err := a.content.ListVocabByKind(r.Context(), model.EntityKind(kind), locale(r))
	a.respond(w, rows, err)
}

func (a *API) getVocab(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	row, err := a.content.GetVocab(r.Context(), id, locale(r))
	a.respond(w, row, err)
}

func (a *API) patchVocab(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	var in service.UpdateVocabInput
	if !decode(w, r, &in) {
		return
	}
	row, err := a.content.UpdateVocab(r.Context(), id, in, locale(r))
	a.respond(w, row, err)
}

func (a *API) putTranslation(w http.ResponseWriter, r *http.Request) {
	var in service.UpsertTranslationInput
	if !decode(w, r, &in) {
		return
	}
	err := a.content.UpsertTranslation(r.Context(), in)
	if err != nil {
		a.respond(w, nil, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (a *API) deleteTranslation(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	id, err := strconv.ParseInt(q.Get("entity_id"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "entity_id required")
		return
	}
	err = a.content.DeleteTranslation(r.Context(), service.DeleteTranslationInput{
		EntityKind: model.EntityKind(q.Get("entity_kind")),
		EntityID:   id,
		Locale:     model.Locale(q.Get("locale")),
		Field:      model.TranslationField(q.Get("field")),
	})
	if err != nil {
		a.respond(w, nil, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (a *API) completeness(w http.ResponseWriter, r *http.Request) {
	rows, err := a.content.Completeness(r.Context(), locale(r))
	a.respond(w, rows, err)
}

func (a *API) exportMarkdown(w http.ResponseWriter, r *http.Request) {
	loc := r.URL.Query().Get("locale")
	if loc == "" {
		loc = "en"
	}
	if loc != "en" && loc != string(model.LocaleRU) {
		writeError(w, http.StatusBadRequest, "locale must be en or ru")
		return
	}
	md, err := a.content.ExportMarkdown(r.Context(), model.Locale(loc))
	if err != nil {
		a.respond(w, nil, err)
		return
	}
	name := "kedom-core.md"
	if loc != "en" {
		name = "kedom-core-" + loc + ".md"
	}
	w.Header().Set("Content-Type", "text/markdown; charset=utf-8")
	w.Header().Set("Content-Disposition", `attachment; filename="`+name+`"`)
	w.WriteHeader(http.StatusOK)
	if _, err := w.Write([]byte(md)); err != nil {
		a.log.Printf("write markdown: %v", err)
	}
}

func (a *API) respond(w http.ResponseWriter, body any, err error) {
	if err == nil {
		writeJSON(w, http.StatusOK, body)
		return
	}
	switch {
	case errors.Is(err, service.ErrNotFound):
		writeError(w, http.StatusNotFound, err.Error())
	case errors.Is(err, service.ErrInvalid):
		writeError(w, http.StatusBadRequest, err.Error())
	default:
		a.log.Printf("handler error: %v", err)
		writeError(w, http.StatusInternalServerError, "internal error")
	}
}

func locale(r *http.Request) model.Locale {
	l := r.URL.Query().Get("locale")
	if l == "" {
		return model.LocaleRU
	}
	return model.Locale(l)
}

func pathID(w http.ResponseWriter, r *http.Request) (int64, bool) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return 0, false
	}
	return id, true
}

func decode(w http.ResponseWriter, r *http.Request, dst any) bool {
	defer r.Body.Close()
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(dst); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return false
	}
	return true
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(body); err != nil {
		log.Printf("encode response: %v", err)
	}
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}
