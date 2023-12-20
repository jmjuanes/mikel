import {html, render, classMap, styleMap} from "./mikel.js";

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

    it("should support nested literal templates", () => {
        const button = () => {
            return html`<button class="btn">Click me!</button>`;
        };
        const el = render(html`
            <div align="center">
                ${button()}
            </div>
        `);

        expect(el.querySelector("button.btn")).not.toBeNull();
        expect(el.querySelector("button.btn").tagName).toEqual("BUTTON");
        expect(el.querySelector("button.btn").textContent).toEqual("Click me!");
    });

    it("should support events in nested literal templates", () => {
        const handleButton1Click = jest.fn();
        const handleButton2Click = jest.fn();
        const handleButton3Click = jest.fn();
        const button = () => {
            return html`<button class="btn" onClick="${handleButton2Click}">Click me!</button>`;
        };
        const el = render(html`
            <div align="center">
                <button onClick="${handleButton1Click}">Click</button>
                ${button()}
                <button onClick="${handleButton3Click}">Click</button>
            </div>
        `);

        el.querySelector("button.btn").click();
        expect(Array.from(el.querySelectorAll("button"))).toHaveLength(3);
        expect(handleButton2Click).toHaveBeenCalled();
    });

    it("shoudl support nested literals in arrays", () => {
        const button = () => html`<button>Click me!</button>`;
        const el = render(html`
            <div align="center">
                ${[button(), button(), button()]}
            </div>
        `);

        expect(Array.from(el.querySelectorAll("button"))).toHaveLength(3);
    });

    it("should not add falsy values", () => {
        const el = render(html`
            <div>Value is: <span>${false}</span></div>
        `);

        expect(el.textContent).toEqual("Value is: ");
        expect(el.querySelector("span").textContent).toEqual("");
    });
});

describe("classMap", () => {
    it("should generate a valid class string", () => {
        const className = classMap({
            "class1": true,
            "class2": false,
            "class3": true,
        });

        expect(className).toEqual("class1 class3");
    });

    it("should return an empty string if no class object is provided", () => {
        expect(classMap()).toEqual("");
    });

    it("should return unique classnames", () => {
        const className = classMap({
            "class1": true,
            "class2 class1": true,
            "class3 class2": true,
        });

        expect(className).toEqual("class1 class2 class3");
    });
});

describe("styleMap", () => {
    it("should generate a valid style string", () => {
        const styleName = styleMap({
            "background-color": "red",
            "margin": "5px 0px",
        });

        expect(styleName).toEqual("background-color:red;margin:5px 0px;");
    });

    it("should accept style attributes in camelCase format", () => {
        const styleName = styleMap({
            backgroundColor: "red",
            paddingTop: "1rem",
        });

        expect(styleName).toEqual("background-color:red;padding-top:1rem;");
    });

    it("should return an empty string if no style object is provided", () => {
        expect(styleMap()).toEqual("");
    });
});
