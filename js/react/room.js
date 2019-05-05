class Room extends React.Component
{
	render()
	{
		let val = "";
        if ( this.props.isStart )
        {
            val = "🚹";
        }
        else if ( this.props.isBoss )
        {
            val = "🆚";
        }
        else 
        {
            val = this.props.isOpen ? "🔲" : "⬛️";
        }
		
		return (
	        <span>{val}</span>
		);
	}
}