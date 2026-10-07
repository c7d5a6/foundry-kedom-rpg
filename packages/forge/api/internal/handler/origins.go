package handler

import (
	"net/http"

	"github.com/c7d5a6/foundry-kedom-rpg/packages/forge/api/internal/service"
)

func (a *API) mountOrigins(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/talents", a.listTalents)
	mux.HandleFunc("POST /api/talents", a.createTalent)
	mux.HandleFunc("GET /api/talents/{id}", a.getTalent)
	mux.HandleFunc("PATCH /api/talents/{id}", a.patchTalent)
	mux.HandleFunc("DELETE /api/talents/{id}", a.deleteTalent)

	mux.HandleFunc("GET /api/races", a.listRaces)
	mux.HandleFunc("POST /api/races", a.createRace)
	mux.HandleFunc("GET /api/races/{id}", a.getRace)
	mux.HandleFunc("PATCH /api/races/{id}", a.patchRace)
	mux.HandleFunc("DELETE /api/races/{id}", a.deleteRace)

	mux.HandleFunc("GET /api/regions", a.listRegions)
	mux.HandleFunc("POST /api/regions", a.createRegion)
	mux.HandleFunc("GET /api/regions/{id}", a.getRegion)
	mux.HandleFunc("PATCH /api/regions/{id}", a.patchRegion)
	mux.HandleFunc("DELETE /api/regions/{id}", a.deleteRegion)

	mux.HandleFunc("GET /api/backgrounds", a.listBackgrounds)
	mux.HandleFunc("POST /api/backgrounds", a.createBackground)
	mux.HandleFunc("GET /api/backgrounds/{id}", a.getBackground)
	mux.HandleFunc("PATCH /api/backgrounds/{id}", a.patchBackground)
	mux.HandleFunc("DELETE /api/backgrounds/{id}", a.deleteBackground)
}

func (a *API) listTalents(w http.ResponseWriter, r *http.Request) {
	rows, err := a.content.ListTalents(r.Context(), locale(r))
	a.respond(w, rows, err)
}

func (a *API) createTalent(w http.ResponseWriter, r *http.Request) {
	var in service.CreateTalentInput
	if !decode(w, r, &in) {
		return
	}
	row, err := a.content.CreateTalent(r.Context(), in, locale(r))
	a.respond(w, row, err)
}

func (a *API) getTalent(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	row, err := a.content.GetTalent(r.Context(), id, locale(r))
	a.respond(w, row, err)
}

func (a *API) patchTalent(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	var in service.UpdateTalentInput
	if !decode(w, r, &in) {
		return
	}
	row, err := a.content.UpdateTalent(r.Context(), id, in, locale(r))
	a.respond(w, row, err)
}

func (a *API) listRaces(w http.ResponseWriter, r *http.Request) {
	rows, err := a.content.ListRaces(r.Context(), locale(r))
	a.respond(w, rows, err)
}

func (a *API) createRace(w http.ResponseWriter, r *http.Request) {
	var in service.CreateRaceInput
	if !decode(w, r, &in) {
		return
	}
	row, err := a.content.CreateRace(r.Context(), in, locale(r))
	a.respond(w, row, err)
}

func (a *API) getRace(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	row, err := a.content.GetRace(r.Context(), id, locale(r))
	a.respond(w, row, err)
}

func (a *API) patchRace(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	var in service.UpdateRaceInput
	if !decode(w, r, &in) {
		return
	}
	row, err := a.content.UpdateRace(r.Context(), id, in, locale(r))
	a.respond(w, row, err)
}

func (a *API) listRegions(w http.ResponseWriter, r *http.Request) {
	rows, err := a.content.ListRegions(r.Context(), locale(r))
	a.respond(w, rows, err)
}

func (a *API) createRegion(w http.ResponseWriter, r *http.Request) {
	var in service.CreateRegionInput
	if !decode(w, r, &in) {
		return
	}
	row, err := a.content.CreateRegion(r.Context(), in, locale(r))
	a.respond(w, row, err)
}

func (a *API) getRegion(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	row, err := a.content.GetRegion(r.Context(), id, locale(r))
	a.respond(w, row, err)
}

func (a *API) patchRegion(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	var in service.UpdateRegionInput
	if !decode(w, r, &in) {
		return
	}
	row, err := a.content.UpdateRegion(r.Context(), id, in, locale(r))
	a.respond(w, row, err)
}

func (a *API) listBackgrounds(w http.ResponseWriter, r *http.Request) {
	rows, err := a.content.ListBackgrounds(r.Context(), locale(r))
	a.respond(w, rows, err)
}

func (a *API) createBackground(w http.ResponseWriter, r *http.Request) {
	var in service.CreateBackgroundInput
	if !decode(w, r, &in) {
		return
	}
	row, err := a.content.CreateBackground(r.Context(), in, locale(r))
	a.respond(w, row, err)
}

func (a *API) getBackground(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	row, err := a.content.GetBackground(r.Context(), id, locale(r))
	a.respond(w, row, err)
}

func (a *API) patchBackground(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	var in service.UpdateBackgroundInput
	if !decode(w, r, &in) {
		return
	}
	row, err := a.content.UpdateBackground(r.Context(), id, in, locale(r))
	a.respond(w, row, err)
}

func (a *API) deleteTalent(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	err := a.content.DeleteTalent(r.Context(), id)
	if err != nil {
		a.respond(w, nil, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (a *API) deleteRace(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	err := a.content.DeleteRace(r.Context(), id)
	if err != nil {
		a.respond(w, nil, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (a *API) deleteRegion(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	err := a.content.DeleteRegion(r.Context(), id)
	if err != nil {
		a.respond(w, nil, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (a *API) deleteBackground(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	err := a.content.DeleteBackground(r.Context(), id)
	if err != nil {
		a.respond(w, nil, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}
