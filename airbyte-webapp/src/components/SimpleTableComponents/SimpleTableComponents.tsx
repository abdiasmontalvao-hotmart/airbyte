import styled from "styled-components";

export const Row = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  align-items: center;
  height: 32px;
  position: relative;

  font-size: 14px;
  line-height: 17px;
  font-weight: normal;
  color: ${({ theme }) => theme.darkPrimaryColor};
  border: none;
`;

export const Header = styled(Row)`
  font-weight: 600;
  color: ${({ theme }) => theme.textColor};
  height: 17px;
  padding: 0;
`;

const flexCalc = (flex?: string | number) => (typeof flex === "number" ? `${flex} 0 0 ` : flex) ?? "1 0 0";

export const Cell = styled.div<{
  flex?: string | number;
  light?: boolean;
  ellipsis?: boolean;
  flush?: boolean;
}>`
  flex: ${({ flex }) => flexCalc(flex)};
  min-width: ${({ flex }) => (typeof flex === "string" ? flex.split(" ")[2] : undefined)};
  padding-right: ${({ flush }) => (flush ? 0 : 10)}px;
  word-break: break-word;
  color: ${({ theme, light }) => (light ? theme.greyColor60 : "inherit")};
  font-weight: ${({ light }) => (light ? "normal" : "inherit")};

  overflow: ${({ ellipsis }) => (ellipsis ? "hidden" : "inherit")};
  text-overflow: ${({ ellipsis }) => (ellipsis ? "ellipsis" : "inherit")};
`;
