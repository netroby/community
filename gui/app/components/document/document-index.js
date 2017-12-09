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

import { computed } from '@ember/object';
import Component from '@ember/component';
import tocUtil from '../../utils/toc';
import NotifierMixin from '../../mixins/notifier';

export default Component.extend(NotifierMixin, {
	document: {},
	folder: {},
	pages: [],
	currentPageId: "",
	state: {
		actionablePage: false,
		upDisabled: true,
		downDisabled: true,
		indentDisabled: true,
		outdentDisabled: true
	},
	emptyState: computed('pages', function () {
		return this.get('pages.length') === 0;
	}),

	didReceiveAttrs() {
		this._super(...arguments);

		this.set('showToc', is.not.undefined(this.get('pages')) && this.get('pages').get('length') > 0);

		if (is.not.null(this.get('currentPageId'))) {
			this.send('onEntryClick', this.get('currentPageId'));
		}
	},

	didInsertElement() {
		this._super(...arguments);

		this.eventBus.subscribe('documentPageAdded', this, 'onDocumentPageAdded');
	},

	willDestroyElement() {
		this._super(...arguments);

		this.eventBus.unsubscribe('documentPageAdded');
	},

	onDocumentPageAdded(pageId) {
		this.send('onEntryClick', pageId);
	},

	// Controls what user can do with the toc (left sidebar).
	// Identifies the target pages.
	setState(pageId) {
		this.set('currentPageId', pageId);

		let toc = this.get('pages');
		let page = _.findWhere(toc, { id: pageId });
		let state = tocUtil.getState(toc, page);

		if (!this.get('permissions.documentEdit') || is.empty(pageId)) {
			state.actionablePage = false;
			state.upDisabled = state.downDisabled = state.indentDisabled = state.outdentDisabled = true;
		}

		this.set('state', state);
	},

	actions: {
		// Page up - above pages shunt down.
		pageUp() {
			if (this.get('state.upDisabled')) {
				return;
			}

			let state = this.get('state');
			let pages = this.get('pages');
			let page = _.findWhere(pages, { id: this.get('currentPageId') });
			let pendingChanges = tocUtil.moveUp(state, pages, page);

			if (pendingChanges.length > 0) {
				this.attrs.onPageSequenceChange(pendingChanges);

				this.send('onEntryClick', this.get('currentPageId'));
				this.showNotification("Moved up");
			}
		},

		// Move down -- pages below shift up.
		pageDown() {
			if (this.get('state.downDisabled')) {
				return;
			}

			let state = this.get('state');
			var pages = this.get('pages');
			var page = _.findWhere(pages, { id: this.get('currentPageId') });
			let pendingChanges = tocUtil.moveDown(state, pages, page);

			if (pendingChanges.length > 0) {
				this.attrs.onPageSequenceChange(pendingChanges);

				this.send('onEntryClick', this.get('currentPageId'));
				this.showNotification("Moved down");
			}
		},

		// Indent - changes a page from H2 to H3, etc.
		pageIndent() {
			if (this.get('state.indentDisabled')) {
				return;
			}

			let state = this.get('state');
			var pages = this.get('pages');
			var page = _.findWhere(pages, { id: this.get('currentPageId') });
			let pendingChanges = tocUtil.indent(state, pages, page);

			if (pendingChanges.length > 0) {
				this.attrs.onPageLevelChange(pendingChanges);

				this.showNotification("Indent");
				this.send('onEntryClick', this.get('currentPageId'));
			}
		},

		// Outdent - changes a page from H3 to H2, etc.
		pageOutdent() {
			if (this.get('state.outdentDisabled')) {
				return;
			}

			let state = this.get('state');
			var pages = this.get('pages');
			var page = _.findWhere(pages, { id: this.get('currentPageId') });
			let pendingChanges = tocUtil.outdent(state, pages, page);

			if (pendingChanges.length > 0) {
				this.attrs.onPageLevelChange(pendingChanges);

				this.showNotification("Outdent");
				this.send('onEntryClick', this.get('currentPageId'));
			}
		},

		onEntryClick(id) {
			this.setState(id);
			this.attrs.onGotoPage(id);
		}
	}
});
