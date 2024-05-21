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
	constructor() {
		this.combatantToEdit = null;

		Hooks.on("renderCombatTracker", (app, html, options) => {
			// Find all the combatant list items.
			const combatants = html[0].querySelectorAll("li.combatant");
			for (const li of combatants) {
				const combatantId = li.dataset?.combatantId;
				if (!combatantId)
					continue;

				const combatant = options.combat.combatants.get(combatantId);
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
						const initiativeInt = parseFloat(e.currentTarget.value);
						options.combat.setInitiative(combatantId, initiativeInt);
					});

					// Gain focus if this was that combatant that had just had the "Roll Initiative" button right-clicked.
					if (this.combatantToEdit === combatantId)
						initiative.focus();
				}
				else {
					const rollInitiative = li.querySelector(".combatant-control.roll");
					if (rollInitiative) {
						// Handle right click on the "roll initiative" button.
						rollInitiative.addEventListener("contextmenu", e => {
							e.preventDefault();
							e.stopPropagation();

							options.combat.setInitiative(combatantId, 0);
							this.combatantToEdit = combatantId;
						});
					}
				}
			}

			this.combatantToEdit = null;
		});
	}
}

const easyInitiative = new EasyInitiative();
