import { styled } from "@material-ui/core/styles";
import Paper from "@material-ui/core/Paper";
import brandTokens from "../../theme/brandTokens";

const TicketAdvancedLayout = styled(Paper)({
  height: `calc(100% - ${brandTokens.layout.appBarHeight}px)`,
  display: "grid",
  gridTemplateRows: "44px 1fr"
});

export default TicketAdvancedLayout;
