let level = null;

let renderLevel = function()
{
	let width = document.getElementById( "input_width" ).value;
	let height = document.getElementById( "input_height" ).value;
	let pathLength = document.getElementById( "input_path_length" ).value;
	let offshootCount = document.getElementById( "input_offshoot_count" ).value;
		
	if ( !level )
	{
		level = ReactDOM.render( <Level width={width} height={height} pathLength={pathLength} offshootCount={offshootCount}/>, document.getElementById( "level_container" ) );
	}
	else
	{
		//this is definitely not the right React way to do this...
		level.setState({data:LevelGenerator.createLevel( width, height, pathLength, offshootCount )});
	}
}