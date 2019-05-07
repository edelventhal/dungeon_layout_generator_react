class Level extends React.Component
{
    constructor( props )
    {
        super(props);
        
        //call setState manually before rendering
        //{
            // data: LevelGenData object
        //
    }
    
    renderRoom( roomPos )
    {
        let roomKey = roomPos.getKey();
        
        return (
            <Room
                key={"room_" + roomKey}
                className="levelRoom"
                isStart={this.state.data.startCoordinate.x === roomPos.x && this.state.data.startCoordinate.y === roomPos.y}
                isBoss={this.state.data.endCoordinate.x === roomPos.x && this.state.data.endCoordinate.y === roomPos.y}
                isOpen={this.state.data.roomExists( roomPos )}
                isOnPath={this.props.showPath && this.state.data.isOnPath( roomPos )}
                cost={this.state.data.level[roomKey] ? this.state.data.level[roomKey].cost : 0}
                usesEmoji={this.props.usesEmoji}
                showsCost={this.props.showsCost}
            />
        );
    }
    
    getRoomsArray()
    {
        let arr = [];
        
        if ( this.state && this.state.data )
        {
            for ( let y = this.state.data.bounds.min.y - 1; y <= this.state.data.bounds.max.y + 1; y++ )
            {
                let children = [];
            
                for ( let x = this.state.data.bounds.min.x - 1; x <= this.state.data.bounds.max.x + 1; x++ )
                {
                    children.push( this.renderRoom( new Coordinate( x, y ) ) );
                }
            
                arr.push(<div key={"row_" + y} className="levelRow">{children}</div>);
            }
        }
        
        return arr;
    }
    
    render()
    {
        return (<div className="level">{this.getRoomsArray()}</div>);
    }
}