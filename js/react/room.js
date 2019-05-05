class Room extends React.Component
{
    render()
    {
        let className = "levelRoomSpan";
        let val = "";
        
        if ( this.props.isStart )
        {
            val = "🚹";
        }
        else if ( this.props.isBoss )
        {
            val = "🆚";
        }
        else if ( this.props.usesEmoji )
        {
            val = this.props.isOpen ? "🔲" : "⬛️";
        }
        else
        {
            className += " " + ( this.props.isOpen ? "empty" : "full" );
        }
        
        return (
            <span className={className}>{val}</span>
        );
    }
}