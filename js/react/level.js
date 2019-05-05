class Level extends React.Component
{
	constructor( props )
	{
		super(props);
		
		this.state = 
		{
			data: LevelGenerator.createLevel( props.width, props.height, props.pathLength, props.offshootCount )
		};
	}
	
	renderRoom( roomPos )
	{
		return (
			<Room
				key={"room_" + roomPos.toString()}
				className="levelRoom"
				isStart={this.state.data.startCoordinate.x === roomPos.x && this.state.data.startCoordinate.y === roomPos.y}
				isBoss={this.state.data.endCoordinate.x === roomPos.x && this.state.data.endCoordinate.y === roomPos.y}
				isOpen={this.state.data.roomExists( roomPos )}
			/>
		);
	}
	
	getRoomsArray()
	{
		let arr = [];
		
		for ( let y = this.state.data.bounds.min.y; y <= this.state.data.bounds.max.y; y++ )
		{
			let children = [];
			
			for ( let x = this.state.data.bounds.min.x; x <= this.state.data.bounds.max.x; x++ )
			{
				children.push( this.renderRoom( new Coordinate( x, y ) ) );
			}
			
			arr.push(<div key={"row_" + y} className="levelRow">{children}</div>);
		}
		
		return arr;
	}
	
	render()
	{
		return (<div className="level">{this.getRoomsArray()}</div>);
	}
}