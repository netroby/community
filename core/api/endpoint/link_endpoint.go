// Copyright 2016 Documize Inc. <legal@documize.com>. All rights reserved.
//
// This software (Documize Community Edition) is licensed under
// GNU AGPL v3 http://www.gnu.org/licenses/agpl-3.0.en.html
//
// You can operate outside the AGPL restrictions by purchasing
// Documize Enterprise Edition and obtaining a commercial license
// by contacting <sales@documize.com>.
//
// https://documize.com

package endpoint

import (
	"database/sql"
	"encoding/json"
	"net/http"

	"github.com/gorilla/mux"

	"github.com/documize/community/core/api/entity"
	"github.com/documize/community/core/api/request"
	"github.com/documize/community/core/api/util"
)

// GetLinkCandidates returns references to documents/sections/attachments.
func GetLinkCandidates(w http.ResponseWriter, r *http.Request) {
	method := "GetLinkCandidates"
	p := request.GetPersister(r)

	params := mux.Vars(r)
	documentID := params["documentID"]
	pageID := params["pageID"]

	// parameter check
	if len(documentID) == 0 {
		util.WriteMissingDataError(w, method, "documentID")
		return
	}

	if len(pageID) == 0 {
		util.WriteMissingDataError(w, method, "pageID")
		return
	}

	// permission check
	if !p.CanViewDocument(documentID) {
		util.WriteForbiddenError(w)
		return
	}

	// We can link to a section within the same document so
	// let's get all pages for the document and remove "us".
	pages, err := p.GetPagesWithoutContent(documentID)

	if err != nil && err != sql.ErrNoRows {
		util.WriteServerError(w, method, err)
		return
	}

	if len(pages) == 0 {
		pages = []entity.Page{}
	}

	pc := []entity.LinkCandidate{}

	for _, p := range pages {
		if p.RefID != pageID {
			c := entity.LinkCandidate{
				RefID:      util.UniqueID(),
				DocumentID: documentID,
				PageID:     p.RefID,
				LinkType:   "section",
				Title:      p.Title,
			}
			pc = append(pc, c)
		}
	}

	// We can link to attachment within the same document so
	// let's get all attachments for the document.
	files, err := p.GetAttachments(documentID)

	if err != nil && err != sql.ErrNoRows {
		util.WriteServerError(w, method, err)
		return
	}

	if len(files) == 0 {
		files = []entity.Attachment{}
	}

	fc := []entity.LinkCandidate{}

	for _, f := range files {
		c := entity.LinkCandidate{
			RefID:        util.UniqueID(),
			DocumentID:   documentID,
			AttachmentID: f.RefID,
			LinkType:     "file",
			Title:        f.Filename,
		}

		fc = append(fc, c)
	}

	// send back the payload
	var payload struct {
		Pages       []entity.LinkCandidate `json:"pages"`
		Attachments []entity.LinkCandidate `json:"attachments"`
		Matches     []entity.LinkCandidate `json:"matches"`
	}

	payload.Pages = pc
	payload.Attachments = fc

	json, err := json.Marshal(payload)

	if err != nil {
		util.WriteMarshalError(w, err)
		return
	}

	util.WriteSuccessBytes(w, json)
}

/*
	DocumentID string `json:"documentId"`
	PageID     string `json:"pageId"`
	FileID     string `json:"fileId"`
	LinkType   string `json:"linkType"`
	Title      string `json:"caption"` // what we label the link
	Context    string `json:"context"` // additional context (e.g. excerpt, parent)

*/
