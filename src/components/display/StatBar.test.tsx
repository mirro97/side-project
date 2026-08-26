import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import { StatBar } from "./StatBar"

function widthOf(container: HTMLElement) {
  const fill = container.querySelector(".rounded-full > div") as HTMLElement
  return fill.style.width
}

describe("StatBar", () => {
  it("중간값은 비율대로 그린다", () => {
    const { container } = render(<StatBar label="속도" value={680} range={[540, 820]} />)
    expect(widthOf(container)).toBe("50%")
  })

  it("최댓값은 100% 다", () => {
    const { container } = render(<StatBar label="속도" value={820} range={[540, 820]} />)
    expect(widthOf(container)).toBe("100%")
  })

  it("최솟값이어도 막대가 보인다", () => {
    // 볼트는 speed 가 전체 최솟값(540)이라 0% 가 되어 막대가 사라졌다
    const { container } = render(<StatBar label="속도" value={540} range={[540, 820]} />)
    expect(widthOf(container)).toBe("3%")
  })

  it("범위가 무너져도 터지지 않는다", () => {
    const { container } = render(<StatBar label="속도" value={100} range={[100, 100]} />)
    expect(widthOf(container)).toBe("3%")
  })
})
