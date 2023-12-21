import {html, render, diff, classMap, styleMap} from "./mikel.js";

describe("html", () => {
    let parent = null;

    beforeEach(() => {
        parent = document.createElement("div");
    });

    it("should render a basic element", () => {
        render(parent, html`<div class="test"></div>`);

        expect(Array.from(parent.childNodes)).toHaveLength(1);
        expect(parent.firstChild.tagName.toLowerCase()).toEqual("div");
        expect(Array.from(parent.firstChild.classList)).toContain("test");
    });

    it("should set text attributes", () => {
        const className = "test";
        render(parent, html`<button class="${className}"></button>`);
        expect(Array.from(parent.querySelector("button").classList)).toContain(className);
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
        render(parent, html`
            <div id="test1" onClick="${handleClick1}"></div>
            <div id="test2" onClick="${handleClick2}"></div>
        `);

        parent.querySelector(`div#test2`).click();
        expect(handleClick1).not.toHaveBeenCalled();
        expect(handleClick2).toHaveBeenCalled();
    });

    it("should support nested literal templates", () => {
        const button = () => {
            return html`<button class="btn">Click me!</button>`;
        };
        render(parent, html`
            <div align="center">
                ${button()}
            </div>
        `);

        expect(parent.querySelector("button.btn")).not.toBeNull();
        expect(parent.querySelector("button.btn").tagName).toEqual("BUTTON");
        expect(parent.querySelector("button.btn").textContent).toEqual("Click me!");
    });

    it("should support events in nested literal templates", () => {
        const handleButton1Click = jest.fn();
        const handleButton2Click = jest.fn();
        const handleButton3Click = jest.fn();
        const button = () => {
            return html`<button class="btn" onClick="${handleButton2Click}">Click me!</button>`;
        };
        render(parent, html`
            <button onClick="${handleButton1Click}">Click</button>
            ${button()}
            <button onClick="${handleButton3Click}">Click</button>
        `);

        parent.querySelector("button.btn").click();
        expect(Array.from(parent.querySelectorAll("button"))).toHaveLength(3);
        expect(handleButton2Click).toHaveBeenCalled();
    });

    it("should support nested literals in arrays", () => {
        const button = () => html`<button>Click me!</button>`;
        render(parent, html`
            <div align="center">
                ${[button(), button(), button()]}
            </div>
        `);

        expect(Array.from(parent.querySelectorAll("button"))).toHaveLength(3);
    });

    it("should not add falsy values", () => {
        render(parent, html`
            <div>Value is: <span>${false}</span></div>
        `);

        expect(parent.textContent).toEqual("Value is: ");
        expect(parent.querySelector("span").textContent).toEqual("");
    });
    
    it("should remove useless nodes", () => {
        render(parent, html`
            <div>Hello</div>
            <div>World</div>
        `);
        expect(Array.from(parent.childNodes)).toHaveLength(2);
    });
});

describe("diff", () => {
    let source = null, target = null;
    beforeEach(() => {
        source = document.createElement("div");
        target = document.createElement("div");
    });

    it("should add all nodes from target if source is empty", () => {
        render(target, html`
            <div id="el1"></div>
            <div id="el2"></div>
        `);
        expect(Array.from(source.childNodes)).toHaveLength(0);
        diff(source, target);
        expect(Array.from(source.childNodes)).toHaveLength(2);
        expect(source.querySelector("div#el1")).not.toBeNull();
        expect(source.querySelector("div#el2")).not.toBeNull();
    });

    it("should remove extra dom nodes in source", () => {
        render(source, html`<div></div><div></div>`);
        expect(Array.from(source.childNodes)).toHaveLength(2);
        diff(source, target);
        expect(Array.from(source.childNodes)).toHaveLength(0);
    });

    it("should patch attributes in source", () => {
        const handleClick = jest.fn();
        render(source, html`<div></div>`);
        render(target, html`
            <div data-id="test" class="test" onClick="${handleClick}" style="color:red;"></div>
        `);
        diff(source, target);
        expect(source.firstChild.dataset.id).toEqual("test");
        expect(Array.from(source.firstChild.classList)).toContain("test");
        expect(source.firstChild.onclick).toEqual(handleClick);
        expect(source.firstChild.getAttribute("style")).toEqual("color:red;");
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
