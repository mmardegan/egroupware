/*
 * Calendar owner widget
 *
 * @license https://opensource.org/licenses/gpl-license.php GPL - GNU General Public License
 * @package calendar
 * @subpackage etemplate
 * @link https://www.egroupware.org
 * @author Nathan Gray
 */

import {Et2Select} from "../../api/js/etemplate/Et2Select/Et2Select";
import {css, html, nothing, TemplateResult} from "@lion/core";
import {IsEmail} from "../../api/js/etemplate/Validators/IsEmail";
import {SelectOption} from "../../api/js/etemplate/Et2Select/FindSelectOptions";
import {Et2StaticSelectMixin} from "../../api/js/etemplate/Et2Select/StaticOptions";

/**
 * Select widget customised for calendar owner, which can be a user
 * account or group, or an entry from almost any app, or an email address
 *
 */
export class CalendarOwner extends Et2StaticSelectMixin(Et2Select)
{

	static get styles()
	{
		return [
			...super.styles,
			css`
			/* Larger maximum height before scroll*/
			.select__tags {
				max-height: 10em;
			}
			`
		];
	}

	constructor(...args : any[])
	{
		super(...args);
		this.searchUrl = "calendar_owner_etemplate_widget::ajax_search";
		this.multiple = true;

		// Take grants into account for search
		this.searchOptions['checkgrants'] = true;
	}

	/**
	 * Override parent to show email address in options
	 *
	 * We use this in edit dialog, but the same widget is used in sidemenu where the email is hidden via CSS.
	 * Anything set in "title" will be shown
	 *
	 * @param {SelectOption} option
	 * @returns {TemplateResult}
	 */
	_optionTemplate(option : SelectOption) : TemplateResult
	{
		// Tag used must match this.optionTag, but you can't use the variable directly.
		// Pass option along so SearchMixin can grab it if needed
		return html`
            <sl-menu-item value="${option.value}"
                          title="${!option.title || this.noLang ? option.title : this.egw().lang(option.title)}"
                          class="${option.class}" .option=${option}
                          ?disabled=${option.disabled}
            >
                ${this._iconTemplate(option)}
                ${this.noLang ? option.label : this.egw().lang(option.label)}
                <span class="title" slot="suffix">${option.title}</span>
            </sl-menu-item>`;
	}

	/**
	 * Customise how tags are rendered.  Overridden from parent to add email to title for hover
	 *
	 * @param item
	 * @protected
	 */
	protected _createTagNode(item)
	{
		const tag = super._createTagNode(item);
		if(item.title)
		{
			tag.title = item.title;
		}
		return tag;
	}

	/**
	 * Override parent to handle our special additional data types (c#,r#,etc.) when they
	 * are not available client side.
	 *
	 * @param {string|string[]} _value array of selected owners, which can be a number,
	 *	or a number prefixed with one character indicating the resource type.
	 */
	set_value(_value)
	{
		super.set_value(_value);

		// If parent didn't find a label, label will be the same as ID so we
		// can find them that way
		let missing_labels = [];
		this.updateComplete.then(() =>
		{
			for(var i = 0; i < this.value.length; i++)
			{
				if(!this.select_options.find(o => o.value == this.value[i]))
				{
					missing_labels.push(this.value[i]);
				}
			}
			if(Object.keys(missing_labels).length > 0)
			{
				// Proper label was not found by parent - ask directly
				this.egw().json('calendar_owner_etemplate_widget::ajax_owner', [missing_labels], function(data)
				{
					for(let owner in data)
					{
						if(!owner || typeof owner == "undefined")
						{
							continue;
						}
						// Put it in the list of options
						let index = this.select_options.findIndex(o => o.value == owner);
						let remote_index = this._selected_remote.findIndex(o => o.value == owner);
						if(remote_index !== -1)
						{
							this._selected_remote[remote_index] = data[owner];
						}
						else if(index == -1)
						{
							this._selected_remote.push(data[owner]);
						}
					}
					this.requestUpdate("select_options");
					this.updateComplete.then(() => {this.syncItemsFromValue();});
				}, this, true, this).sendRequest();
			}
		});
	}

	/**
	 * Check a value for missing options and remove them.
	 *
	 * Override to allow any value, since we won't have all options
	 *
	 * @param {string[]} value
	 * @returns {string[]}
	 */
	filterOutMissingOptions(value : string[]) : string[]
	{
		return value;
	}

	/**
	 * Override icon for the select option to use lavatar
	 *
	 * @param option
	 * @protected
	 */
	protected _iconTemplate(option)
	{
		// Not a user / contact, no icon - use app image
		if(!option.fname && !option.lname && !option.icon && option.app)
		{
			return html`
                <et2-image src="${option.app}/navbar" style="width: var(--icon-width)"></et2-image>`;
		}
		// lavatar uses a size property, not a CSS variable
		let style = getComputedStyle(this);
		return html`
            <et2-lavatar slot="prefix" part="icon" .size=${style.getPropertyValue("--icon-width")}
                         lname=${option.lname || nothing}
                         fname=${option.fname || nothing}
                         image=${option.icon || nothing}
            >
            </et2-lavatar>`;
	}

	/**
	 * Check if a free entry value is acceptable.
	 * We only check the free entry, since value can be mixed.
	 *
	 * @param text
	 * @returns {boolean}
	 */
	public validateFreeEntry(text) : boolean
	{
		let validators = [...this.validators, new IsEmail()];
		let result = validators.filter(v =>
			v.execute(text, v.param, {node: this}),
		);
		return result.length == 0;
	}
}

if(!customElements.get("et2-calendar-owner"))
{
	customElements.define("et2-calendar-owner", CalendarOwner);
}