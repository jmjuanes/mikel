import {html, render} from "./mikel.js";

describe("html", () => {
    it("should render a basic element", () => {
        const el = render(html`<div class="test"></div>`);

        expect(el).toBeDefined();
        expect(el.tagName.toLowerCase()).toEqual("div");
        expect(Array.from(el.classList)).toContain("test");
    });

    it("should set text attributes", () => {
        const className = "test";
        const el = render(html`<button class="${className}"></button>`);
        expect(Array.from(el.classList)).toContain(className);
    });
    
    // it("should set boolean attributes", () => {
    //     const isChecked = true;
    //     const element = html`
    //         <input type="checkbox" ?checked="${isChecked}" />
    //     `;

    //     render(parent, element);
    //     expect(parent.querySelector("input").checked).toEqual(isChecked);
    // });

    it("should set events", () => {
        const handleClick1 = jest.fn();
        const handleClick2 = jest.fn();
        const el = render(html`
            <div>
                <div id="test1" onClick="${handleClick1}"></div>
                <div id="test2" onClick="${handleClick2}"></div>
            </div>
        `);

        // parent.querySelector(`div#test1`).click();
        el.querySelector(`div#test2`).click();
        expect(handleClick1).not.toHaveBeenCalled();
        expect(handleClick2).toHaveBeenCalled();
    });
});
