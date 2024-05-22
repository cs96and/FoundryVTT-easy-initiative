/*
 * Easy Initiative
 * https://github.com/cs96and/FoundryVTT-easy-initiative
 *
 * Copyright (c) 2023-2024 Alan Davies - All Rights Reserved.
 *
 * You may use, distribute and modify this code under the terms of the MIT license.
 *
 * You should have received a copy of the MIT license with this file. If not, please visit:
 * https://mit-license.org/
 */

class EasyInitiative {
	#combatantToEdit;
	#dragged;

	constructor() {
		Hooks.on("renderCombatTracker", this.#onRenderCombatTracker.bind(this));
	}

	#getCombatant(li, combat) {
		const combatantId = li?.dataset?.combatantId;
		if (!combatantId) return;
		return combat.combatants.get(combatantId);
	}

	#onRenderCombatTracker(app, html, options) {
		// Make the combat list into a drop target.
		if (game.user.isGM) {
			const combatTracker = html[0].querySelector("ol#combat-tracker");
			combatTracker.ondragover = (e) => e.preventDefault();
			combatTracker.ondrop = (e) => this.#onDrop(e, combatTracker, options.combat);
		}

		// Find all the combatant list items.
		const combatants = html[0].querySelectorAll("li.combatant");
		for (const li of combatants) {
			if (game.user.isGM) {
				// Make the item dragable
				li.draggable = true;
				li.ondragstart = (e) => this.#dragged = this.#getCombatant(li, options.combat);
				li.ondragend = (e) => this.#dragged = null;

				// Make the item a drop target
				li.ondragover = (e) => e.preventDefault();
				li.ondrop = (e) => this.#onDrop(e, li, options.combat);
			}

			const combatant = this.#getCombatant(li, options.combat);
			if (!combatant?.isOwner)
				continue;

			const initiativeSpan = li.querySelector("span.initiative");
			if (initiativeSpan) {
				const initiative = document.createElement("input");
				initiative.setAttribute("type", "number");
				initiative.classList.add("easy-init-input");
				initiative.value = initiativeSpan.textContent;
				initiativeSpan.replaceChild(initiative, initiativeSpan.firstChild);

				// Prevent double clicking the initiative from opening the character sheet.
				initiative.addEventListener("dblclick", e => e.stopPropagation());
				initiative.addEventListener("click", e => e.stopPropagation());

				// Select all text when gaining focus.
				initiative.addEventListener("focus", e => e.currentTarget.select());

				// Handle enter being pressed.
				initiative.addEventListener("change", e => {
					e.stopPropagation();

					// Lose the focus to trigger the initiative update.
					e.currentTarget.blur();
				});

				// Handle the initialive losing focus.
				initiative.addEventListener("blur", e => {
					if (combatant.id == this.#combatantToEdit)
						this.#combatantToEdit = null;

					const initiative = parseFloat(e.currentTarget.value);
					options.combat.setInitiative(combatant.id, initiative);
				});

				// Gain focus if this was the combatant that had just had the "Roll Initiative" button right-clicked.
				// Wait 1ms before focusing, because if the right click caused the item to move position, it will
				// cause another re-render and a blur.  Waiting for 1ms forces the refocus to happen after the blur.
				if (this.#combatantToEdit === combatant.id)
					setTimeout(() => initiative.focus(), 1);
			}
			else {
				const rollInitiative = li.querySelector(".combatant-control.roll");
				if (rollInitiative) {
					// Handle right click on the "roll initiative" button.
					rollInitiative.addEventListener("contextmenu", e => {
						e.preventDefault();
						e.stopPropagation();

						this.#combatantToEdit = combatant.id;
						options.combat.setInitiative(combatant.id, 0);
					});
				}
			}
		}
	}

	#onDrop(event, elem, combat) {
		if (!this.#dragged) return;

		event.preventDefault();
		event.stopPropagation();

		let newInit;

		if (elem.tagName === "OL") {
			// Dropped onto the list itself, so must have been dropped at the bottom.
			// Set the initiative to one less than the last combatant that has an initiative.
			let lastCombatant;
			for (let child = elem.lastElementChild ; child && !lastCombatant; child = child.previousElementSibling) {
				const combatant = this.#getCombatant(child, combat);
				if (combatant.initiative != null)
					lastCombatant = combatant;
			}

			if (lastCombatant !== this.#dragged)
				newInit = (lastCombatant ? lastCombatant.initiative - 1 : 0);
		} else {
			const targetCombatant = this.#getCombatant(elem, combat);

			if (targetCombatant && (targetCombatant !== this.#dragged)) {
				const previousCombatant = this.#getCombatant(elem.previousElementSibling, combat);

				if (previousCombatant !== this.#dragged) {
					// Set initiative to halfway between the drop target and the previous combatant
					// If dropped at the top, set the initiative to one more than the current top
					newInit = (previousCombatant ? 
						((targetCombatant.initiative ?? 0) + (((previousCombatant.initiative ?? 0) - (targetCombatant.initiative ?? 0)) / 2)) :
						((targetCombatant.initiative ?? 0) + 1));
				}
			}
		}

		if (newInit != null)
			combat.setInitiative(this.#dragged.id, newInit);
	}
}

const easyInitiative = new EasyInitiative();
